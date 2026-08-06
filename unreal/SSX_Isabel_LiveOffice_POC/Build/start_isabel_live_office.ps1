$ErrorActionPreference = 'Stop'

Write-Host '=== SSX Isabel Live Office - One Click Startup ==='

$root = Join-Path $HOME 'Documents\SSX\ssx-isabel-v1'
$branch = 'isabel-live-office-poc'
$project = Join-Path $root 'unreal\SSX_Isabel_LiveOffice_POC\SSX_Isabel_LiveOffice_POC.uproject'
$health = Join-Path $root 'unreal\SSX_Isabel_LiveOffice_POC\Build\run_health_report.ps1'

if (-not (Test-Path $root)) {
  throw "Project folder not found: $root. Run setup_home_ai_pc.ps1 first."
}

Set-Location $root
Write-Host '[1/8] Updating repository...'
git fetch origin
git checkout $branch
git pull origin $branch

Write-Host '[2/8] Running preflight health report...'
if (Test-Path $health) { & $health }

Write-Host '[3/8] Locating Unreal Editor...'
$editors = @(
  'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'D:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
)
$editor = $editors | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $editor) { throw 'Unreal Engine 5.7 not found.' }

Write-Host '[4/8] Opening Isabel Unreal project...'
Start-Process -FilePath $editor -ArgumentList @('"' + $project + '"')

Write-Host '[5/8] Waiting for Unreal startup...'
Start-Sleep -Seconds 12

Write-Host '[6/8] Browser shell target prepared.'
Write-Host 'Once Pixel Streaming is running, open the SSX /live-office route.'

Write-Host '[7/8] Startup status:'
Write-Host "  Project: $project"
Write-Host "  Branch:  $branch"
Write-Host "  Editor:  $editor"

Write-Host '[8/8] Next inside Unreal:'
Write-Host '  Run Build/first_launch_bootstrap.py if the POC map is not yet built.'
Write-Host '  Then run the Pixel Streaming local launcher and open Chrome.'
