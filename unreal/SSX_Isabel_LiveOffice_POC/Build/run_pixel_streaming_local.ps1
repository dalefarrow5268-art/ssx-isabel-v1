param(
  [string]$ExecutablePath,
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'isabel_machine_config.json')
)

$ErrorActionPreference = 'Stop'
$config = & (Join-Path $PSScriptRoot 'import_isabel_machine_config.ps1') -ConfigPath $ConfigPath

if (-not $ExecutablePath) {
  $candidate = Join-Path $config.repo.local_path 'unreal\SSX_Isabel_LiveOffice_POC\Packaged\Windows\SSX_Isabel_LiveOffice_POC.exe'
  if (Test-Path $candidate) { $ExecutablePath = $candidate }
}
if (-not $ExecutablePath -or -not (Test-Path $ExecutablePath)) {
  throw "Packaged Unreal executable not found. Supply -ExecutablePath or package to the configured project location."
}

$hostName = $config.pixel_streaming.signalling_host
$port = [int]$config.pixel_streaming.streamer_port
$signallingUrl = "ws://${hostName}:$port"

Write-Host 'Launching Isabel Live Office with Pixel Streaming 2...'
Write-Host "Signalling URL: $signallingUrl"
Write-Host "HTTP port: $($config.pixel_streaming.http_port)"
Write-Host "SFU port: $($config.pixel_streaming.sfu_port)"

$arguments = @(
  "-PixelStreamingURL=$signallingUrl",
  '-RenderOffScreen',
  '-AudioMixer',
  '-Unattended'
)

Start-Process -FilePath $ExecutablePath -ArgumentList $arguments
Write-Host 'Unreal streamer launched from canonical machine config.'
