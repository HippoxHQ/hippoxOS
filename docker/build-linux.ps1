# ============================================================
# Usage:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#
#   cd \docker
#
#   # Commonly used
#   .\build-linux.ps1 -Clean -Mirror zh
#
#   # First Run
#   .\build-linux.ps1 -Clean -Rebuild -Mirror zh
#    
#   # Default: build all formats (deb + rpm + appimage), use crates.io
#   .\build-linux.ps1
#
#   # Build only deb (fastest)
#   .\build-linux.ps1 -Bundles deb
#
#   # Build only AppImage
#   .\build-linux.ps1 -Bundles appimage
#
#   # Use China mirror (rsproxy.cn) - useful when crates.io is unreachable
#   .\build-linux.ps1 -Mirror zh
#
#   # Force rebuild the image (after Dockerfile changes)
#   .\build-linux.ps1 -Rebuild
#
#   # Clean all cache volumes, then rebuild (after dependency changes / when broken)
#   .\build-linux.ps1 -Clean
#
#   # Combined: clean cache + rebuild image + China mirror + only deb
#   .\build-linux.ps1 -Clean -Rebuild -Mirror zh -Bundles deb
# ============================================================

<#
.SYNOPSIS
    Build Tauri Linux packages via Docker.

.DESCRIPTION
    Automates: check Docker -> build image (if needed) -> compile -> report artifacts.

.PARAMETER Bundles
    Comma-separated bundle formats. Default: deb,rpm,appimage
    Examples: deb | deb,rpm | appimage | all

.PARAMETER Rebuild
    Force rebuild the Docker image even if it already exists.

.PARAMETER Clean
    Remove all cache volumes before building (use when dependencies change).

.PARAMETER Mirror
    Cargo registry mirror. "en" = crates.io (default), "zh" = rsproxy.cn.

.EXAMPLE
    .\build-linux.ps1
    .\build-linux.ps1 -Bundles deb
    .\build-linux.ps1 -Mirror zh
    .\build-linux.ps1 -Bundles deb,appimage -Rebuild
    .\build-linux.ps1 -Clean -Mirror zh
#>

param(
    [string]$Bundles = "deb,rpm,appimage",
    [ValidateSet("en", "zh")]
    [string]$Mirror  = "en",
    [switch]$Rebuild,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

# Always run from the script's own directory (docker/)
Set-Location $PSScriptRoot

$ImageName   = "tauri-linux-builder:latest"
$ServiceName = "tauri-linux"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BundleDir   = Join-Path $ProjectRoot "src-tauri\target-linux\release\bundle"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Check Docker is available and running
Write-Step "Checking Docker..."
try {
    docker info *> $null
} catch {
    Write-Err "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}
Write-Ok "Docker is running."

# Show mirror selection
Write-Step "Cargo mirror: $Mirror"

# Optional: clean cache volumes
if ($Clean) {
    Write-Step "Removing cache volumes..."
    docker compose down -v
    Write-Ok "Cache volumes removed."
}

# Build image if missing or forced
$imageExists = docker images -q $ImageName
if ($Rebuild -or -not $imageExists) {
    if ($Rebuild) {
        Write-Step "Rebuilding Docker image (forced)..."
    } else {
        Write-Step "Image not found. Building Docker image..."
    }
    docker compose build
    if ($LASTEXITCODE -ne 0) { Write-Err "Image build failed."; exit $LASTEXITCODE }
    Write-Ok "Image built: $ImageName"
} else {
    Write-Ok "Image already exists: $ImageName (use -Rebuild to force rebuild)"
}

# Compile (Yarn + optional Cargo mirror, controlled by $env:MIRROR)
Write-Step "Compiling Tauri Linux bundles: $Bundles"
$env:MIRROR   = $Mirror
$innerCmd     = "yarn install --frozen-lockfile && yarn tauri build --bundles $Bundles"
docker compose run --rm $ServiceName bash -c "$innerCmd"

if ($LASTEXITCODE -ne 0) {
    Write-Err "Compilation failed. Check the log above."
    exit $LASTEXITCODE
}
Write-Ok "Compilation finished."

# Report artifacts
Write-Step "Artifacts location:"
if (Test-Path $BundleDir) {
    Get-ChildItem -Path $BundleDir -Recurse -File |
        Where-Object { $_.Extension -in ".deb", ".rpm", ".AppImage" } |
        ForEach-Object {
            $sizeMB = [math]::Round($_.Length / 1MB, 2)
            Write-Host ("  {0}  ({1} MB)" -f $_.FullName, $sizeMB) -ForegroundColor White
        }
    Write-Host ""
    Write-Ok "Done. Folder: $BundleDir"
} else {
    Write-Warn "Bundle directory not found: $BundleDir"
    Write-Warn "The build may have produced no bundles, or the mount path is wrong."
    exit 1
}