param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'isabel_machine_config.json')
)

$ErrorActionPreference = 'Stop'
Write-Host '=== SSX Isabel Live Office - Config Driven Startup ==='

$configLoader = Join-Path $PSScriptRoot 'import_isabel_machine_config.ps1'
$config = & $configLoader -ConfigPath $ConfigPath
$root = $config.repo.local_path
$branch = $config.repo.branch
$project = $config.unreal.project_file
$editor = $config.unreal.editor_exe
$health = Join-Path $PSScriptRoot 'run_health_report.ps1'

if (-not (Test-Path $root)) { throw "Project folder not found: $root. Run setup_home_ai_pc.ps1 first." }
if (-not (Test-Path $project)) { throw "Unreal project not found: $project" }
if (-not (Test-Path $editor)) { throw "Configured Unreal Editor not found: $editor" }

Set-Location $root
Write-Host '[1/8] Updating configured repository branch...'
try {
  git fetch origin $branch
  git checkout $branch
  git pull --ff-only origin $branch
} catch {
  Write-Warning "Git update failed; continuing with installed revision: $($_.Exception.Message)"
}

Write-Host '[2/8] Running preflight health report...'
if (Test-Path $health) { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $health }

Write-Host '[3/8] Validating configured Unreal Editor...'
Write-Host "  Engine: $($config.unreal.engine_version)"
Write-Host "  Editor: $editor"

Write-Host '[4/8] Opening Isabel Unreal project...'
$arguments = @('"' + $project + '"')
if ($config.unreal.map) { $arguments += $config.unreal.map }
Start-Process -FilePath $editor -ArgumentList $arguments

Write-Host '[5/8] Waiting for Unreal startup...'
Start-Sleep -Seconds ([Math]::Min([int]$config.runtime.startup_timeout_seconds, 15))

Write-Host '[6/8] Browser and screen targets:'
Write-Host "  Front door: $($config.web.front_door_url)"
Write-Host "  Live office: $($config.web.live_office_path)"
Write-Host "  Stream URL: $($config.web.stream_url)"
Write-Host "  Screen base: $($config.screens.base_url)"

Write-Host '[7/8] Pixel Streaming config:'
Write-Host "  Signalling host: $($config.pixel_streaming.signalling_host)"
Write-Host "  HTTP port: $($config.pixel_streaming.http_port)"
Write-Host "  Streamer port: $($config.pixel_streaming.streamer_port)"
Write-Host "  SFU port: $($config.pixel_streaming.sfu_port)"

Write-Host '[8/8] Startup prepared. Live session gate still decides READY/LIVE.'
