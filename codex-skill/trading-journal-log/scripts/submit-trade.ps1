param(
  [Parameter(Mandatory = $true)]
  [string]$ManifestPath
)

$ErrorActionPreference = "Stop"
$skillRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $skillRoot "references\\local-config.json"
if (-not (Test-Path -LiteralPath $configPath)) { throw "Trading Journal helper is not configured. Enable it again in Settings." }
if (-not (Test-Path -LiteralPath $ManifestPath)) { throw "The manifest file does not exist." }

$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ($manifest.schemaVersion -ne 1 -or $manifest.source -ne "codex") { throw "Unsupported Trading Journal import schema." }
if ([string]::IsNullOrWhiteSpace($manifest.importId) -or $manifest.importId -notmatch '^[A-Za-z0-9_-]{1,100}$') { throw "importId must contain only letters, numbers, underscores, or hyphens." }

if ($null -ne $manifest.screenshot -and -not [string]::IsNullOrWhiteSpace($manifest.screenshot.path)) {
  $imagePath = [System.IO.Path]::GetFullPath([string]$manifest.screenshot.path)
  if (Test-Path -LiteralPath $imagePath -PathType Leaf) {
    $manifest.screenshot.sha256 = (Get-FileHash -LiteralPath $imagePath -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}

$pendingPath = [string]$config.pendingPath
[System.IO.Directory]::CreateDirectory($pendingPath) | Out-Null
$destination = Join-Path $pendingPath ($manifest.importId + ".json")
$temporary = $destination + ".tmp"
$manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $temporary -Encoding UTF8
Move-Item -LiteralPath $temporary -Destination $destination -Force
Write-Output $destination

