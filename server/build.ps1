# PoolX one-shot build script (Windows PowerShell)
#
# Usage:
#   cd D:\github\PoolX\server
#   .\build.ps1                 # full build (web + zashboard + Go exe)
#   .\build.ps1 -SkipFrontend   # skip frontend, Go only
#   .\build.ps1 -SkipTidy       # skip go mod tidy
#   .\build.ps1 -SkipTest       # skip go test
#
# Note: this script is intentionally ASCII-only to avoid PowerShell 5.x
# code-page issues when reading UTF-8 files without a BOM.

param(
    [switch]$SkipFrontend,
    [switch]$SkipTidy,
    [switch]$SkipTest
)

$ErrorActionPreference = 'Stop'

# Force console to UTF-8 so child processes (pnpm/go) print non-ASCII correctly.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try { chcp 65001 > $null } catch {}

$serverDir = $PSScriptRoot
$webDir = Join-Path $serverDir 'web'
$zashDir = Join-Path $serverDir 'zashboard'
$outExe = Join-Path $serverDir 'poolx.exe'

function Step($title) {
    Write-Host ''
    Write-Host "==== $title ====" -ForegroundColor Cyan
}

function Fail($msg) {
    Write-Host ''
    Write-Host "[X] $msg" -ForegroundColor Red
    exit 1
}

$started = Get-Date

# ---------- 1. go mod tidy ----------
if (-not $SkipTidy) {
    Step '1/5  go mod tidy'
    Push-Location $serverDir
    try {
        go mod tidy
        if ($LASTEXITCODE -ne 0) { Fail 'go mod tidy failed' }
    } finally { Pop-Location }
} else {
    Write-Host 'skip go mod tidy' -ForegroundColor Yellow
}

# ---------- 2. go test ----------
if (-not $SkipTest) {
    Step '2/5  go test'
    Push-Location $serverDir
    try {
        go test ./internal/pkg/proxy/... ./internal/pkg/runtimeconfig/... ./internal/service/...
        if ($LASTEXITCODE -ne 0) { Fail 'go test failed' }
    } finally { Pop-Location }
} else {
    Write-Host 'skip go test' -ForegroundColor Yellow
}

# ---------- 3. Next.js frontend ----------
if (-not $SkipFrontend) {
    Step '3/5  pnpm build (web)'
    Push-Location $webDir
    try {
        if (-not (Test-Path 'node_modules')) {
            Write-Host 'web/node_modules missing, running install...'
            pnpm install --frozen-lockfile
            if ($LASTEXITCODE -ne 0) { Fail 'web pnpm install failed' }
        }
        pnpm build
        if ($LASTEXITCODE -ne 0) { Fail 'web pnpm build failed' }
    } finally { Pop-Location }

    # ---------- 4. zashboard ----------
    Step '4/5  pnpm build (zashboard)'
    Push-Location $zashDir
    try {
        if (-not (Test-Path 'node_modules')) {
            Write-Host 'zashboard/node_modules missing, running install...'
            pnpm install --frozen-lockfile
            if ($LASTEXITCODE -ne 0) { Fail 'zashboard pnpm install failed' }
        }
        pnpm build
        if ($LASTEXITCODE -ne 0) { Fail 'zashboard pnpm build failed' }
    } finally { Pop-Location }
} else {
    Write-Host 'skip frontend build (web/build and zashboard/dist must exist)' -ForegroundColor Yellow
    if (-not (Test-Path (Join-Path $webDir 'build'))) {
        Fail 'web/build not found; cannot skip frontend build'
    }
    if (-not (Test-Path (Join-Path $zashDir 'dist'))) {
        Fail 'zashboard/dist not found; cannot skip frontend build'
    }
}

# ---------- 5. go build ----------
Step '5/5  go build -> poolx.exe'
Push-Location $serverDir
try {
    if (Test-Path $outExe) {
        Remove-Item $outExe -Force
    }
    go build -trimpath -ldflags '-s -w' -o poolx.exe .
    if ($LASTEXITCODE -ne 0) { Fail 'go build failed' }
} finally { Pop-Location }

# ---------- summary ----------
$elapsed = (Get-Date) - $started
$size = (Get-Item $outExe).Length / 1MB
Write-Host ''
Write-Host '==== BUILD OK ====' -ForegroundColor Green
Write-Host ("artifact : {0}" -f $outExe)
Write-Host ("size     : {0:N1} MB" -f $size)
Write-Host ("elapsed  : {0:N1} s" -f $elapsed.TotalSeconds)
