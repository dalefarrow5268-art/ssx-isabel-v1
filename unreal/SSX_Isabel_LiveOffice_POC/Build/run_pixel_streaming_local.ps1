param(
  [Parameter(Mandatory=$true)]
  [string]$ExecutablePath,
  [string]$SignallingUrl = 'ws://127.0.0.1:8888'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ExecutablePath)) {
  throw "Packaged Unreal executable not found: $ExecutablePath"
}

Write-Host 'Launching Isabel Live Office with Pixel Streaming 2...'
Write-Host "Signalling URL: $SignallingUrl"

$arguments = @(
  "-PixelStreamingURL=$SignallingUrl",
  '-RenderOffScreen',
  '-AudioMixer',
  '-Unattended'
)

Start-Process -FilePath $ExecutablePath -ArgumentList $arguments

Write-Host 'Unreal streamer launched.'
Write-Host 'Start the Epic Pixel Streaming signalling/web server separately, then open its browser page.'
