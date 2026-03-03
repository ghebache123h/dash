$ErrorActionPreference = "Stop"

function Get-CommandOrNull {
    param([string]$Name)
    return Get-Command $Name -ErrorAction SilentlyContinue
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$runtimeDir = Join-Path $repoRoot ".runtime"
$pidFile = Join-Path $runtimeDir "cloudflared.pid"
$logFile = Join-Path $runtimeDir "cloudflared.log"
$urlFile = Join-Path $runtimeDir "public_events_url.txt"

if (Test-Path $pidFile) {
    $pidValue = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($pidValue) {
        $existing = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "Stopping cloudflared PID $pidValue ..." -ForegroundColor Cyan
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "Stopping docker compose services..." -ForegroundColor Cyan
if (Get-CommandOrNull "docker") {
    docker compose down
}
else {
    Write-Warning "Docker was not found in PATH, so compose services were not stopped."
}

Remove-Item $logFile -Force -ErrorAction SilentlyContinue
Remove-Item $urlFile -Force -ErrorAction SilentlyContinue

Write-Host "Local analytics stack stopped." -ForegroundColor Green
