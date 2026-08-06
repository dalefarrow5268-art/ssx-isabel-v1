param(
  [string]$TaskName = 'SSX Isabel Live Office',
  [string]$RepoRoot = "$HOME\Documents\SSX\ssx-isabel-v1"
)

$ErrorActionPreference = 'Stop'
$launcher = Join-Path $RepoRoot 'unreal\SSX_Isabel_LiveOffice_POC\Build\start_isabel_supervised.ps1'
if (-not (Test-Path $launcher)) { throw "Missing launcher: $launcher" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null

Write-Host "Installed Windows Scheduled Task: $TaskName"
Write-Host "Launcher: $launcher"
Write-Host 'Isabel will start after user logon. The live session gate still controls whether the office may report READY/LIVE.'
