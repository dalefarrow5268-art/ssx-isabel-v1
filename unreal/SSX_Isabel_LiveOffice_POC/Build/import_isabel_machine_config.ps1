param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'isabel_machine_config.json')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ConfigPath)) {
  $example = Join-Path $PSScriptRoot 'isabel_machine_config.example.json'
  throw "Missing machine config: $ConfigPath. Copy $example to isabel_machine_config.json and fill in the home-machine values."
}

function Expand-IsabelPath([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return $Value }
  return [Environment]::ExpandEnvironmentVariables($Value)
}

$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json

if ($config.schema_version -ne 1) { throw "Unsupported Isabel machine config schema: $($config.schema_version)" }
if (-not $config.repo.branch) { throw 'Config is missing repo.branch' }
if (-not $config.repo.local_path) { throw 'Config is missing repo.local_path' }
if (-not $config.unreal.editor_exe) { throw 'Config is missing unreal.editor_exe' }
if (-not $config.unreal.project_file) { throw 'Config is missing unreal.project_file' }
if ($config.quality.external_action_replay_allowed -eq $true) { throw 'Unsafe config: external_action_replay_allowed must remain false.' }

$config.repo.local_path = Expand-IsabelPath $config.repo.local_path
$config.unreal.editor_exe = Expand-IsabelPath $config.unreal.editor_exe
$config.runtime.state_dir = Expand-IsabelPath $config.runtime.state_dir
$config.runtime.log_dir = Expand-IsabelPath $config.runtime.log_dir

if (-not [System.IO.Path]::IsPathRooted($config.unreal.project_file)) {
  $config.unreal.project_file = Join-Path $config.repo.local_path $config.unreal.project_file
}

New-Item -ItemType Directory -Force -Path $config.runtime.state_dir | Out-Null
New-Item -ItemType Directory -Force -Path $config.runtime.log_dir | Out-Null

$script:IsabelConfig = $config
$config
