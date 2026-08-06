$ErrorActionPreference = 'Stop'

Write-Host '=== Isabel Live Office Health Report ==='
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
if (-not $python) { throw 'Python is not available in PATH.' }

$script = Join-Path $here 'project_health_report.py'
& $python.Source $script

Write-Host ''
Write-Host 'Report saved to:'
Write-Host (Join-Path $here 'latest_health_report.json')
