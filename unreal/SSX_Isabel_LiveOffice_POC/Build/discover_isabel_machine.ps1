param(
  [string]$RepoRoot = "$HOME\Documents\SSX\ssx-isabel-v1",
  [switch]$WriteCanonicalConfig
)

$ErrorActionPreference = 'Stop'
$build = Join-Path $RepoRoot 'unreal\SSX_Isabel_LiveOffice_POC\Build'
if (-not (Test-Path $build)) { throw "Isabel Build folder not found: $build" }

function Expand-EnvPath([string]$value) {
  if (-not $value) { return $value }
  return [Environment]::ExpandEnvironmentVariables($value)
}

function Test-Command([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-TcpPortAvailable([int]$port) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $listener.Start()
    $listener.Stop()
    return $true
  } catch {
    return $false
  }
}

Write-Host '=== SSX Isabel Machine Discovery ==='

$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$computer = Get-CimInstance Win32_ComputerSystem
$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {
  [ordered]@{
    name = $_.Name
    driver_version = $_.DriverVersion
    vram_mb = if ($_.AdapterRAM) { [math]::Round($_.AdapterRAM / 1MB) } else { $null }
  }
})

$nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
$nvidiaDetail = $null
if ($nvidiaSmi) {
  try {
    $raw = & nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader,nounits 2>$null
    $nvidiaDetail = @($raw | ForEach-Object {
      $parts = $_ -split ',' | ForEach-Object { $_.Trim() }
      [ordered]@{ name=$parts[0]; driver_version=$parts[1]; vram_mb=[int]$parts[2] }
    })
  } catch { $nvidiaDetail = $null }
}

$editorCandidates = @(
  'C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'D:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe',
  'E:\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor.exe'
)
$selectedEditor = $editorCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$projectRelative = 'unreal\SSX_Isabel_LiveOffice_POC\SSX_Isabel_LiveOffice_POC.uproject'
$projectFull = Join-Path $RepoRoot $projectRelative

$ipv4 = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -ne '127.0.0.1' } |
  Select-Object -ExpandProperty IPAddress -Unique)
$gateway = @(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
  Sort-Object RouteMetric |
  Select-Object -First 1 -ExpandProperty NextHop)

$ports = [ordered]@{}
foreach ($p in @(80,8888,8889)) { $ports["$p"] = Test-TcpPortAvailable $p }

$report = [ordered]@{
  generated_at = (Get-Date).ToString('o')
  computer_name = $env:COMPUTERNAME
  os = [ordered]@{
    caption = $os.Caption
    version = $os.Version
    architecture = $os.OSArchitecture
  }
  cpu = [ordered]@{
    name = $cpu.Name
    logical_processors = $computer.NumberOfLogicalProcessors
    ram_gb = [math]::Round($computer.TotalPhysicalMemory / 1GB, 1)
  }
  gpu = [ordered]@{
    adapters = $gpus
    nvidia_smi_available = [bool]$nvidiaSmi
    nvidia_detail = $nvidiaDetail
    nvenc_status = if ($nvidiaSmi) { 'needs_live_encoder_validation' } else { 'not_proven' }
  }
  dependencies = [ordered]@{
    git = Test-Command 'git'
    python = Test-Command 'python'
    powershell = $true
    chrome = [bool](Get-Command chrome -ErrorAction SilentlyContinue)
    edge = [bool](Get-Command msedge -ErrorAction SilentlyContinue)
  }
  unreal = [ordered]@{
    requested_version = '5.7'
    candidates = $editorCandidates
    selected_editor_exe = $selectedEditor
    found = [bool]$selectedEditor
    project_file = $projectFull
    project_file_exists = (Test-Path $projectFull)
  }
  network = [ordered]@{
    ipv4 = $ipv4
    default_gateway = $gateway
    loopback = '127.0.0.1'
  }
  ports_available = $ports
}

$reportPath = Join-Path $build 'latest_machine_discovery.json'
$report | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $reportPath

$templatePath = Join-Path $build 'isabel_machine_config.example.json'
if (-not (Test-Path $templatePath)) { throw "Missing config template: $templatePath" }
$config = Get-Content $templatePath -Raw | ConvertFrom-Json
$config.machine_name = $env:COMPUTERNAME
$config.repo.local_path = $RepoRoot
if ($selectedEditor) { $config.unreal.editor_exe = $selectedEditor }
$config.unreal.project_file = $projectRelative
$config.pixel_streaming.signalling_host = '127.0.0.1'
$config.quality.external_action_replay_allowed = $false

$proposedPath = Join-Path $build 'isabel_machine_config.proposed.json'
$config | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $proposedPath

$canonicalPath = Join-Path $build 'isabel_machine_config.json'
if ($WriteCanonicalConfig) {
  if (Test-Path $canonicalPath) {
    throw "Canonical config already exists and will not be overwritten automatically: $canonicalPath"
  }
  Copy-Item $proposedPath $canonicalPath
  Write-Host "Created canonical config: $canonicalPath"
}

Write-Host "Discovery report: $reportPath"
Write-Host "Proposed config:   $proposedPath"
Write-Host "Unreal 5.7:        $(if ($selectedEditor) { $selectedEditor } else { 'NOT FOUND' })"
Write-Host "Project file:      $(if (Test-Path $projectFull) { 'FOUND' } else { 'MISSING' })"
Write-Host "GPU adapters:      $($gpus.Count)"
Write-Host "Ports 80/8888/8889 available: $($ports['80']) / $($ports['8888']) / $($ports['8889'])"
Write-Host 'NVENC is not declared READY until the live Pixel Streaming encoder test succeeds.'
