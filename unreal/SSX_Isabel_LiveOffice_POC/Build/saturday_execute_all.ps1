$ErrorActionPreference = 'Stop'

Write-Host '=== ISABEL SATURDAY EXECUTION ==='
$repo = Join-Path $HOME 'Documents\SSX\ssx-isabel-v1'
$project = Join-Path $repo 'unreal\SSX_Isabel_LiveOffice_POC\SSX_Isabel_LiveOffice_POC.uproject'
$build = Join-Path $repo 'unreal\SSX_Isabel_LiveOffice_POC\Build'

if (-not (Test-Path $repo)) { throw "Repo not found: $repo" }
Set-Location $repo

git fetch origin
git checkout isabel-live-office-poc
git pull origin isabel-live-office-poc

Write-Host '[1/6] Running readiness report...'
& (Join-Path $build 'run_health_report.ps1')

Write-Host '[2/6] Locating Unreal Engine...'
$editors = @(
  'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'D:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
)
$editor = $editors | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $editor) { throw 'Unreal Engine 5.7 not found in expected locations.' }

Write-Host '[3/6] Launching Unreal project...'
Start-Process -FilePath $editor -ArgumentList @($project)

Write-Host '[4/6] Inside Unreal run: Build/master_office_assembly.py'
Write-Host '[5/6] Then run: Build/unreal_runtime_smoke_test.py'
Write-Host '[6/6] If both pass, run: Build/run_pixel_streaming_local.ps1'
Write-Host ''
Write-Host 'Success = office renders, Isabel actor present, four screens present, camera locked, Chrome stream opens.'
