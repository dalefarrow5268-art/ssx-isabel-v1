param(
  [string]$RepoRoot = "$HOME\Documents\SSX\ssx-isabel-v1",
  [switch]$AcceptProposedConfig,
  [switch]$SkipGitUpdate
)

$ErrorActionPreference = 'Stop'

function Step([int]$n, [string]$msg) { Write-Host ("[{0}] {1}" -f $n, $msg) }
function Fail([string]$msg) { Write-Error $msg; exit 1 }

$build = Join-Path $RepoRoot 'unreal\SSX_Isabel_LiveOffice_POC\Build'
if (-not (Test-Path $build)) { Fail "Build folder not found: $build" }

$config = Join-Path $build 'isabel_machine_config.json'
$proposed = Join-Path $build 'isabel_machine_config.proposed.json'
$discovery = Join-Path $build 'discover_isabel_machine.ps1'
$validate = Join-Path $build 'load_isabel_config.ps1'
$health = Join-Path $build 'run_health_report.ps1'
$launcher = Join-Path $build 'start_isabel_supervised.ps1'
$acceptance = Join-Path $build 'SATURDAY_COMMISSIONING_ACCEPTANCE.md'

Step 1 'Confirming repository and branch.'
Set-Location $RepoRoot
if (-not $SkipGitUpdate) {
  try {
    git fetch origin isabel-live-office-poc
    git checkout isabel-live-office-poc
    git pull --ff-only origin isabel-live-office-poc
  } catch {
    Write-Warning "Git update failed; commissioning will continue with installed revision: $($_.Exception.Message)"
  }
}

Step 2 'Discovering actual machine capabilities.'
if (-not (Test-Path $discovery)) { Fail "Missing machine discovery script: $discovery" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $discovery -RepoRoot $RepoRoot
if (-not (Test-Path $proposed)) { Fail 'Machine discovery did not produce isabel_machine_config.proposed.json.' }

Step 3 'Human review gate for machine configuration.'
if (-not (Test-Path $config)) {
  if ($AcceptProposedConfig) {
    Copy-Item $proposed $config -Force
    Write-Host 'Proposed configuration copied to canonical config by explicit switch.'
  } else {
    Write-Host ''
    Write-Host 'STOP: Human review required before commissioning can continue.' -ForegroundColor Yellow
    Write-Host "Review: $proposed"
    Write-Host 'Confirm Unreal path, ports, URLs, screen base URL, and runtime directories.'
    Write-Host 'Then either copy it to isabel_machine_config.json or rerun with -AcceptProposedConfig.'
    exit 20
  }
}

Step 4 'Validating canonical configuration and safety locks.'
if (-not (Test-Path $validate)) { Fail "Missing config loader: $validate" }
. $validate
$cfg = Get-IsabelMachineConfig -BuildDir $build
if (-not $cfg) { Fail 'Configuration validation returned no configuration.' }

Step 5 'Running machine and project health checks.'
if (-not (Test-Path $health)) { Fail "Missing health launcher: $health" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $health
if ($LASTEXITCODE -ne 0) {
  Write-Host 'STOP: Preflight health did not pass. Review the generated health report before continuing.' -ForegroundColor Yellow
  exit 30
}

Step 6 'Commissioning review checkpoint.'
Write-Host ''
Write-Host 'The machine configuration and preflight checks have passed.' -ForegroundColor Green
Write-Host 'Before launching the persistent office, confirm the Saturday commissioning acceptance checklist.'
Write-Host "Checklist: $acceptance"
Write-Host ''
Write-Host 'No irreversible external action has been executed. No firewall or account setting was changed.'

Step 7 'Launching supervised Isabel office stack.'
if (-not (Test-Path $launcher)) { Fail "Missing supervised launcher: $launcher" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher -RepoRoot $RepoRoot

Step 8 'Commissioning handoff.'
Write-Host ''
Write-Host 'Startup supervisor launched.' -ForegroundColor Green
Write-Host 'Next gates are runtime-generated: live-session gate, Pixel Streaming handshake, runtime smoke test, and first live-demo rehearsal.'
Write-Host 'Do not call the office LIVE until those gates pass.'
