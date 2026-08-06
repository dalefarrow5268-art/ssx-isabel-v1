param(
  [string]$ConfigPath = "$(Join-Path $PSScriptRoot 'isabel_machine_config.json')"
)

$ErrorActionPreference = 'Stop'

function Expand-ConfigString([string]$Value) {
  if ($null -eq $Value) { return $null }
  return [Environment]::ExpandEnvironmentVariables($Value)
}

if (-not (Test-Path $ConfigPath)) {
  $example = Join-Path $PSScriptRoot 'isabel_machine_config.example.json'
  throw "Missing machine config: $ConfigPath. Copy $example to isabel_machine_config.json and fill the machine-specific values."
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

$required = @(
  'repo.url',
  'repo.branch',
  'repo.local_path',
  'unreal.engine_version',
  'unreal.editor_exe',
  'unreal.project_file',
  'pixel_streaming.signalling_host',
  'pixel_streaming.http_port',
  'pixel_streaming.streamer_port',
  'runtime.state_dir',
  'runtime.log_dir'
)

function Get-NestedValue($Object, [string]$Path) {
  $current = $Object
  foreach ($part in $Path.Split('.')) {
    if ($null -eq $current.PSObject.Properties[$part]) { return $null }
    $current = $current.$part
  }
  return $current
}

$missing = @()
foreach ($path in $required) {
  $value = Get-NestedValue $config $path
  if ($null -eq $value -or ($value -is [string] -and [string]::IsNullOrWhiteSpace($value))) {
    $missing += $path
  }
}
if ($missing.Count -gt 0) {
  throw "Machine config is incomplete. Missing: $($missing -join ', ')"
}

$config.repo.local_path = Expand-ConfigString $config.repo.local_path
$config.unreal.editor_exe = Expand-ConfigString $config.unreal.editor_exe
$config.runtime.state_dir = Expand-ConfigString $config.runtime.state_dir
$config.runtime.log_dir = Expand-ConfigString $config.runtime.log_dir

$projectPath = if ([IO.Path]::IsPathRooted($config.unreal.project_file)) {
  $config.unreal.project_file
} else {
  Join-Path $config.repo.local_path $config.unreal.project_file
}
$config.unreal.project_file = $projectPath

foreach ($dir in @($config.runtime.state_dir, $config.runtime.log_dir)) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

if ($config.quality.external_action_replay_allowed -eq $true) {
  throw 'Unsafe config: external_action_replay_allowed must remain false.'
}

[PSCustomObject]@{
  config = $config
  resolved = [PSCustomObject]@{
    repo_path = $config.repo.local_path
    unreal_editor = $config.unreal.editor_exe
    project_file = $config.unreal.project_file
    state_dir = $config.runtime.state_dir
    log_dir = $config.runtime.log_dir
    stream_frontend = if ($config.web.stream_url) { $config.web.stream_url } else { "http://$($config.pixel_streaming.signalling_host):$($config.pixel_streaming.http_port)" }
  }
}
