param(
  [string]$RepoRoot = "$HOME\Documents\SSX\ssx-isabel-v1"
)

$ErrorActionPreference = 'Stop'
$build = Join-Path $RepoRoot 'unreal\SSX_Isabel_LiveOffice_POC\Build'
$logDir = Join-Path $build 'runtime_logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("startup_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

function Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format o), $msg
  $line | Tee-Object -FilePath $log -Append
}

Log 'Isabel supervised startup beginning.'
Set-Location $RepoRoot

try {
  git fetch origin isabel-live-office-poc 2>&1 | Tee-Object -FilePath $log -Append
  git checkout isabel-live-office-poc 2>&1 | Tee-Object -FilePath $log -Append
  git pull --ff-only origin isabel-live-office-poc 2>&1 | Tee-Object -FilePath $log -Append
} catch {
  Log "Git update warning: $($_.Exception.Message). Continuing with installed revision."
}

$health = Join-Path $build 'run_health_report.ps1'
if (Test-Path $health) {
  Log 'Running preflight health report.'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $health 2>&1 | Tee-Object -FilePath $log -Append
}

$watchdog = Join-Path $build 'production_watchdog.py'
if (Test-Path $watchdog) {
  Log 'Starting production watchdog.'
  Start-Process -FilePath 'python' -ArgumentList @($watchdog) -WorkingDirectory $build -WindowStyle Hidden
}

$launcher = Join-Path $build 'start_isabel_live_office.ps1'
if (-not (Test-Path $launcher)) { throw "Missing live office launcher: $launcher" }

Log 'Launching Isabel live office.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher 2>&1 | Tee-Object -FilePath $log -Append
Log 'Live office launcher exited. Watchdog owns recovery from this point.'
