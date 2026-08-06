param(
  [string]$HostAddress = '127.0.0.1',
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$build = Split-Path -Parent $MyInvocation.MyCommand.Path
$service = Join-Path $build 'operator_command_service.py'

if (-not (Test-Path $service)) {
  throw "Missing operator command service: $service"
}

$env:ISABEL_OPERATOR_HOST = $HostAddress
$env:ISABEL_OPERATOR_PORT = "$Port"

Write-Host 'Starting Isabel operator command service...'
Write-Host "Host: $HostAddress"
Write-Host "Port: $Port"
Write-Host 'Only allowlisted commissioning commands are executable.'
Write-Host 'No arbitrary shell, Python, Unreal console, or external-action commands are accepted.'

python $service
