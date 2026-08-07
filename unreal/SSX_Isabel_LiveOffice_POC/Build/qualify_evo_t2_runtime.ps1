param(
  [string]$OutputPath = "$PSScriptRoot\latest_evo_t2_qualification.json"
)

$ErrorActionPreference = 'Stop'

function Try-Command([scriptblock]$Block) {
  try { return & $Block } catch { return $null }
}

$gpu = Try-Command { Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, AdapterRAM }
$cpu = Try-Command { Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors }
$os = Try-Command { Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, TotalVisibleMemorySize, FreePhysicalMemory }
$net = Try-Command { Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object InterfaceAlias, IPAddress }

$ports = @{}
foreach ($port in @(80, 8765, 8888, 8889)) {
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  $ports["$port"] = [bool]$listener
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  machine = $env:COMPUTERNAME
  profile = 'GMKtec EVO-T2S / Core Ultra X7 358H / Arc B390 / 64GB'
  cpu = $cpu
  gpu = $gpu
  os = $os
  network = $net
  listeningPorts = $ports
  qualification = [ordered]@{
    unrealInstalled = $false
    projectFound = $false
    operatorServiceListening = $ports['8765']
    pixelStreamingHttpListening = $ports['80']
    pixelStreamingSignallingListening = $ports['8888']
    pixelStreamingSfuListening = $ports['8889']
    runtimeMeasured = $false
    recommendation = 'MEASURE_ARC_B390_FIRST'
  }
  nextMeasurements = @(
    'Unreal editor FPS in Isabel office',
    'GPU utilization and frame time with Isabel visible',
    'Pixel Streaming encode success and sustained FPS',
    '10-minute stream stability',
    'Four monitor surface update stability',
    'Voice + animation + stream simultaneous load',
    'Thermal behavior under sustained load'
  )
}

$possibleEditors = @(
  'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'D:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
)
$editor = $possibleEditors | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($editor) {
  $report.qualification.unrealInstalled = $true
  $report.unrealEditor = $editor
}

$repoCandidates = @(
  "$HOME\Documents\SSX\ssx-isabel-v1",
  "$HOME\ssx-isabel-v1"
)
$repo = $repoCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($repo) {
  $project = Join-Path $repo 'unreal\SSX_Isabel_LiveOffice_POC\SSX_Isabel_LiveOffice_POC.uproject'
  $report.repoRoot = $repo
  $report.qualification.projectFound = Test-Path $project
}

$report | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host "EVO-T2 qualification precheck written to: $OutputPath"
Write-Host 'This precheck does not declare the Arc B390 sufficient or insufficient. Runtime measurements in the real Isabel scene decide that.'
