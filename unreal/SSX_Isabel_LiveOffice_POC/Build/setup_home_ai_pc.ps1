$ErrorActionPreference = 'Stop'

Write-Host '=== SSX Isabel Live Office - Home AI PC Setup ==='
Write-Host ''

$repoUrl = 'https://github.com/dalefarrow5268-art/ssx-isabel-v1.git'
$branch = 'isabel-live-office-poc'
$target = Join-Path $HOME 'Documents\SSX\ssx-isabel-v1'

Write-Host '[1/7] Checking Windows and GPU...'
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture | Format-List
Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion | Format-Table -AutoSize

if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  Write-Host 'NVIDIA details:'
  nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
}

Write-Host '[2/7] Checking Git...'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git is not installed or not in PATH. Install Git for Windows, then run this script again.'
}

Write-Host '[3/7] Preparing project folder...'
New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
if (-not (Test-Path (Join-Path $target '.git'))) {
  git clone $repoUrl $target
}

Set-Location $target
Write-Host '[4/7] Switching to live-office branch...'
git fetch origin
git checkout $branch
git pull origin $branch

Write-Host '[5/7] Looking for Unreal Engine 5.7...'
$possibleEditors = @(
  'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'D:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
)
$editor = $possibleEditors | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($editor) {
  Write-Host "Found Unreal Editor: $editor"
} else {
  Write-Warning 'Unreal Engine 5.7 was not found in the common install locations. Install it in Epic Games Launcher before opening the project.'
}

Write-Host '[6/7] Project location:'
$uproject = Join-Path $target 'unreal\SSX_Isabel_LiveOffice_POC\SSX_Isabel_LiveOffice_POC.uproject'
Write-Host $uproject

Write-Host '[7/7] Setup complete.'
Write-Host ''
Write-Host 'Saturday first-run sequence:'
Write-Host '  1. Install/open Unreal Engine 5.7.'
Write-Host '  2. Open the .uproject above.'
Write-Host '  3. Let Unreal install/enable required plugins and restart if requested.'
Write-Host '  4. Create a blank level.'
Write-Host '  5. Run Build/build_live_office.py from Unreal Python.'
Write-Host '  6. Save the map as Content/Maps/Isabel_LiveOffice_POC.'
Write-Host '  7. Match CAMERA_ARRIVAL to the approved office reference.'
Write-Host ''
Write-Host 'Do not commit DerivedDataCache, Intermediate, Saved, or packaged builds.'
