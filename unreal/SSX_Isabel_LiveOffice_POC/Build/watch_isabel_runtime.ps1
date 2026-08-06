param(
  [int]$PollSeconds = 5,
  [int]$MaxRestarts = 3
)

$ErrorActionPreference = 'Stop'
$BuildDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StatusPath = Join-Path $BuildDir 'latest_watchdog_status.json'
$GateScript = Join-Path $BuildDir 'live_session_gate.py'
$StartScript = Join-Path $BuildDir 'start_isabel_live_office.ps1'
$PixelScript = Join-Path $BuildDir 'run_pixel_streaming_local.ps1'
$ContinuityPath = Join-Path $BuildDir 'latest_continuity_state.json'

$restartCounts = @{
  unreal = 0
  pixel_streaming = 0
  browser_bridge = 0
}

function Write-Status {
  param(
    [string]$State,
    [string]$Component,
    [string]$Message,
    [hashtable]$Extra = @{}
  )

  $body = [ordered]@{
    observedAt = (Get-Date).ToUniversalTime().ToString('o')
    state = $State
    component = $Component
    message = $Message
    restartCounts = $restartCounts
  }
  foreach ($key in $Extra.Keys) { $body[$key] = $Extra[$key] }
  $body | ConvertTo-Json -Depth 8 | Set-Content -Path $StatusPath -Encoding UTF8
  Write-Host "[$State] $Component - $Message"
}

function Test-Port {
  param([int]$Port)
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(750, $false)
    if ($ok -and $client.Connected) { $client.EndConnect($iar); $client.Close(); return $true }
    $client.Close()
  } catch {}
  return $false
}

function Test-UnrealAlive {
  return [bool](Get-Process UnrealEditor -ErrorAction SilentlyContinue)
}

function Test-PixelStreamingAlive {
  # Common local signalling/frontend ports used by the POC. Saturday we will
  # lock these to the exact UE 5.7 Pixel Streaming 2 deployment values.
  return (Test-Port 80) -or (Test-Port 8888) -or (Test-Port 3000)
}

function Preserve-Continuity {
  if (Test-Path $ContinuityPath) {
    $backup = Join-Path $BuildDir ('continuity_watchdog_backup_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.json')
    Copy-Item $ContinuityPath $backup -Force
    return $backup
  }
  return $null
}

function Restart-UnrealSafe {
  if ($restartCounts.unreal -ge $MaxRestarts) {
    Write-Status 'BLOCKED' 'unreal' 'Restart budget exhausted. Manual inspection required.'
    return $false
  }

  $restartCounts.unreal++
  $backup = Preserve-Continuity
  Write-Status 'RECOVERING' 'unreal' 'Unreal heartbeat/process unhealthy; preserving stable continuity and restarting.' @{ continuityBackup = $backup }

  Get-Process UnrealEditor -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3

  if (Test-Path $StartScript) {
    Start-Process powershell.exe -ArgumentList '-ExecutionPolicy','Bypass','-File',("`"$StartScript`"")
    Start-Sleep -Seconds 25
  }
  return (Test-UnrealAlive)
}

function Restart-PixelStreamingSafe {
  if ($restartCounts.pixel_streaming -ge $MaxRestarts) {
    Write-Status 'BLOCKED' 'pixel_streaming' 'Restart budget exhausted. Manual inspection required.'
    return $false
  }

  $restartCounts.pixel_streaming++
  Write-Status 'RECOVERING' 'pixel_streaming' 'Pixel Streaming appears unavailable; restarting only the streaming service.'

  if (Test-Path $PixelScript) {
    Start-Process powershell.exe -ArgumentList '-ExecutionPolicy','Bypass','-File',("`"$PixelScript`"")
    Start-Sleep -Seconds 12
  }
  return (Test-PixelStreamingAlive)
}

Write-Status 'STARTING' 'watchdog' 'Isabel production watchdog started.'

while ($true) {
  try {
    $unrealOk = Test-UnrealAlive
    $pixelOk = Test-PixelStreamingAlive

    if (-not $unrealOk) {
      $recovered = Restart-UnrealSafe
      if (-not $recovered) {
        if ($restartCounts.unreal -ge $MaxRestarts) { break }
        Write-Status 'DEGRADED' 'unreal' 'Restart attempt did not restore Unreal yet.'
      }
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    if (-not $pixelOk) {
      $recovered = Restart-PixelStreamingSafe
      if (-not $recovered) {
        if ($restartCounts.pixel_streaming -ge $MaxRestarts) { break }
        Write-Status 'DEGRADED' 'pixel_streaming' 'Streaming service still unavailable; Unreal remains running.'
      }
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    Write-Status 'HEALTHY' 'watchdog' 'Unreal and Pixel Streaming process-level checks are healthy. Runtime heartbeat/session-gate checks remain authoritative inside Unreal.'
  } catch {
    Write-Status 'DEGRADED' 'watchdog' $_.Exception.Message
  }

  Start-Sleep -Seconds $PollSeconds
}
