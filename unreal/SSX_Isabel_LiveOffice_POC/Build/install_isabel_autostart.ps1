param(
  [string]$TaskName = 'SSX Isabel Live Office',
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'isabel_machine_config.json')
)

$ErrorActionPreference = 'Stop'
$config = & (Join-Path $PSScriptRoot 'import_isabel_machine_config.ps1') -ConfigPath $ConfigPath
$launcher = Join-Path $config.repo.local_path 'unreal\SSX_Isabel_LiveOffice_POC\Build\start_isabel_supervised.ps1'
if (-not (Test-Path $launcher)) { throw "Missing launcher: $launcher" }

$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`" -ConfigPath `"$ConfigPath`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null

Write-Host "Installed Windows Scheduled Task: $TaskName"
Write-Host "Launcher: $launcher"
Write-Host "Config: $ConfigPath"
Write-Host 'Isabel will start after user logon. The live session gate still controls READY/LIVE.'
