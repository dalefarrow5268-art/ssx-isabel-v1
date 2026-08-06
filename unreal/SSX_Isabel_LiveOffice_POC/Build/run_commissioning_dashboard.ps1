param(
  [string]$RepoRoot = "$HOME\Documents\SSX\ssx-isabel-v1"
)

$ErrorActionPreference = 'Stop'
$build = Join-Path $RepoRoot 'unreal\SSX_Isabel_LiveOffice_POC\Build'
$dashboard = Join-Path $build 'commissioning_dashboard.py'
if (-not (Test-Path $dashboard)) { throw "Missing commissioning dashboard: $dashboard" }

Write-Host '=== SSX Isabel Commissioning Dashboard ==='
& python $dashboard
$code = $LASTEXITCODE

switch ($code) {
  0 { Write-Host 'OVERALL: PASS - Isabel may proceed to the live session gate.' }
  1 { Write-Host 'OVERALL: DEGRADED - Review warnings before client use.' }
  default { Write-Host 'OVERALL: BLOCKED - Isabel must not be declared LIVE.' }
}

exit $code
