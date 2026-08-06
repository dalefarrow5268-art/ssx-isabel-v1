param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'isabel_machine_config.json')
)

$ErrorActionPreference = 'Stop'
$config = & (Join-Path $PSScriptRoot 'import_isabel_machine_config.ps1') -ConfigPath $ConfigPath
$RepoRoot = $config.repo.local_path
$build = Join-Path $RepoRoot 'unreal\SSX_Isabel_LiveOffice_POC\Build'
$logDir = $config.runtime.log_dir
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("startup_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

function Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format o), $msg
  $line | Tee-Object -FilePath $log -Append
}

Log "Isabel supervised startup beginning on $($config.machine_name)."
Set-Location $RepoRoot

try {
  git fetch origin $config.repo.branch 2>&1 | Tee-Object -FilePath $log -Append
  git checkout $config.repo.branch 2>&1 | Tee-Object -FilePath $log -Append
  git pull --ff-only origin $config.repo.branch 2>&1 | Tee-Object -FilePath $log -Append
} catch {
  Log "Git update warning: $($_.Exception.Message). Continuing with installed revision."
}

$health = Join-Path $build 'run_health_report.ps1'
if (Test-Path $health) {
  Log 'Running preflight health report.'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $health 2>&1 | Tee-Object -FilePath $log -Append
}

$watchdogCandidates = @(
  (Join-Path $build 'production_watchdog.py'),
  (Join-Path $build 'startup_supervisor_watchdog.py'),
  (Join-Path $build 'isabel_watchdog.py')
)
$watchdog = $watchdogCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($watchdog) {
  Log "Starting watchdog: $watchdog"
  $env:ISABEL_MACHINE_CONFIG = $ConfigPath
  Start-Process -FilePath 'python' -ArgumentList @($watchdog, '--config', $ConfigPath) -WorkingDirectory $build -WindowStyle Hidden
} else {
  Log 'Watchdog script not found; startup will continue but automatic recovery is unavailable.'
}

$launcher = Join-Path $build 'start_isabel_live_office.ps1'
if (-not (Test-Path $launcher)) { throw "Missing live office launcher: $launcher" }

Log 'Launching Isabel live office from canonical machine config.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -ConfigPath $ConfigPath 2>&1 | Tee-Object -FilePath $log -Append
Log 'Live office launcher exited. Watchdog owns recovery when installed.'
