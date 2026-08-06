$ErrorActionPreference = 'Continue'

Write-Host '=== SSX Isabel Live Office - Saturday Readiness Check ==='
Write-Host ''

$repoUrl = 'https://github.com/dalefarrow5268-art/ssx-isabel-v1.git'
$branch = 'isabel-live-office-poc'
$target = Join-Path $HOME 'Documents\SSX\ssx-isabel-v1'
$project = Join-Path $target 'unreal\SSX_Isabel_LiveOffice_POC\SSX_Isabel_LiveOffice_POC.uproject'
$buildDir = Join-Path $target 'unreal\SSX_Isabel_LiveOffice_POC\Build'

$results = @()
function Add-Result($name, $ok, $detail) {
  $script:results += [pscustomobject]@{ Check=$name; Status=$(if($ok){'PASS'}else{'FAIL'}); Detail=$detail }
}

# OS
try {
  $os = Get-CimInstance Win32_OperatingSystem
  Add-Result 'Windows x64' ($os.OSArchitecture -match '64') "$($os.Caption) $($os.Version) $($os.OSArchitecture)"
} catch { Add-Result 'Windows x64' $false $_.Exception.Message }

# CPU/RAM
try {
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  $ramGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
  Add-Result 'CPU detected' ($null -ne $cpu) "$($cpu.Name) | $($cpu.NumberOfCores) cores / $($cpu.NumberOfLogicalProcessors) threads"
  Add-Result 'RAM >= 32 GB' ($ramGB -ge 32) "$ramGB GB"
} catch {
  Add-Result 'CPU/RAM' $false $_.Exception.Message
}

# GPU
try {
  $gpu = Get-CimInstance Win32_VideoController | Sort-Object AdapterRAM -Descending | Select-Object -First 1
  $gpuText = "$($gpu.Name) | Driver $($gpu.DriverVersion)"
  Add-Result 'GPU detected' ($null -ne $gpu) $gpuText
  if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
    $nv = nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader 2>$null
    Add-Result 'NVIDIA hardware encoder path' ($LASTEXITCODE -eq 0) ($nv -join '; ')
  } else {
    Add-Result 'NVIDIA hardware encoder path' $false 'nvidia-smi not found; AMD may still work, but we will verify encoder support manually.'
  }
} catch { Add-Result 'GPU detected' $false $_.Exception.Message }

# Git
$git = Get-Command git -ErrorAction SilentlyContinue
Add-Result 'Git installed' ($null -ne $git) $(if($git){$git.Source}else{'Not found in PATH'})

# Repo + branch
if (Test-Path (Join-Path $target '.git')) {
  Push-Location $target
  git fetch origin | Out-Null
  $current = (git branch --show-current).Trim()
  if ($current -ne $branch) { git checkout $branch | Out-Null; $current = (git branch --show-current).Trim() }
  git pull origin $branch | Out-Null
  Add-Result 'Correct Git branch' ($current -eq $branch) $current
  Pop-Location
} else {
  Add-Result 'Repository cloned' $false "Missing: $target"
}

# Unreal
$editorCandidates = @(
  'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'D:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'E:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
)
$editor = $editorCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
Add-Result 'Unreal Engine 5.7' ($null -ne $editor) $(if($editor){$editor}else{'Not found in common locations'})

# Project files
Add-Result '.uproject present' (Test-Path $project) $project
$required = @(
  'build_live_office.py',
  'office_spec.json',
  'office_command_receiver.py',
  'anchor_registry.py',
  'live_screen_registry.json',
  'isabel_identity_lock.json',
  'character_build_spec.json',
  'saturday_readiness_check.ps1'
)
foreach ($file in $required) {
  $p = Join-Path $buildDir $file
  Add-Result "Build asset: $file" (Test-Path $p) $p
}

# Ports commonly used during local Pixel Streaming validation.
$ports = @(80, 443, 8888, 8889)
foreach ($port in $ports) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  Add-Result "Port $port available" ($null -eq $listener) $(if($listener){'Already in use; inspect before Pixel Streaming setup.'}else{'Available'})
}

Write-Host ''
$results | Format-Table -AutoSize

$failed = @($results | Where-Object Status -eq 'FAIL')
Write-Host ''
if ($failed.Count -eq 0) {
  Write-Host 'READY: Base machine checks passed. Proceed to Unreal first-run and live office build.' -ForegroundColor Green
  exit 0
}

Write-Host "NOT READY: $($failed.Count) check(s) need attention before the full live-office test." -ForegroundColor Yellow
Write-Host 'Failures:'
$failed | ForEach-Object { Write-Host " - $($_.Check): $($_.Detail)" }
exit 1
