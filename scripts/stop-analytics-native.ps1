$ErrorActionPreference = "Stop"

function Stop-ProcessFromPidFile {
    param([string]$PidFile)
    if (-not (Test-Path $PidFile)) {
        return
    }
    $pidValue = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pidValue) {
        $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$runtimeDir = Join-Path $repoRoot ".runtime"
$apiPidFile = Join-Path $runtimeDir "analytics-api-native.pid"
$dashPidFile = Join-Path $runtimeDir "analytics-dashboard-native.pid"
$tunnelPidFile = Join-Path $runtimeDir "cloudflared-native.pid"

Stop-ProcessFromPidFile -PidFile $apiPidFile
Stop-ProcessFromPidFile -PidFile $dashPidFile
Stop-ProcessFromPidFile -PidFile $tunnelPidFile

Write-Host "Native analytics services stopped." -ForegroundColor Green
