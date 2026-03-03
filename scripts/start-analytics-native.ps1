param(
    [switch]$SkipInstall,
    [switch]$SkipTunnel,
    [int]$ApiPort = 8000,
    [int]$DashboardPort = 8501,
    [int]$HealthTimeoutSeconds = 60,
    [string]$DatabaseUrl = "sqlite:///./analytics/local_analytics.db"
)

$ErrorActionPreference = "Stop"

function Get-CommandOrNull {
    param([string]$Name)
    return Get-Command $Name -ErrorAction SilentlyContinue
}

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

function Wait-ForApiHealth {
    param(
        [string]$Url,
        [int]$TimeoutSeconds
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $res = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 5
            if ($res.status -eq "ok") {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$runtimeDir = Join-Path $repoRoot ".runtime"
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$apiPidFile = Join-Path $runtimeDir "analytics-api-native.pid"
$dashPidFile = Join-Path $runtimeDir "analytics-dashboard-native.pid"
$tunnelPidFile = Join-Path $runtimeDir "cloudflared-native.pid"
$apiOutLog = Join-Path $runtimeDir "analytics-api-native.out.log"
$apiErrLog = Join-Path $runtimeDir "analytics-api-native.err.log"
$dashOutLog = Join-Path $runtimeDir "analytics-dashboard-native.out.log"
$dashErrLog = Join-Path $runtimeDir "analytics-dashboard-native.err.log"
$tunnelOutLog = Join-Path $runtimeDir "cloudflared-native.out.log"
$tunnelErrLog = Join-Path $runtimeDir "cloudflared-native.err.log"
$urlFile = Join-Path $runtimeDir "public_events_url.txt"

if (-not (Get-CommandOrNull "python")) {
    throw "Python is not installed or not in PATH."
}

Stop-ProcessFromPidFile -PidFile $apiPidFile
Stop-ProcessFromPidFile -PidFile $dashPidFile
Stop-ProcessFromPidFile -PidFile $tunnelPidFile

Remove-Item $apiOutLog -Force -ErrorAction SilentlyContinue
Remove-Item $apiErrLog -Force -ErrorAction SilentlyContinue
Remove-Item $dashOutLog -Force -ErrorAction SilentlyContinue
Remove-Item $dashErrLog -Force -ErrorAction SilentlyContinue
Remove-Item $tunnelOutLog -Force -ErrorAction SilentlyContinue
Remove-Item $tunnelErrLog -Force -ErrorAction SilentlyContinue
Remove-Item $urlFile -Force -ErrorAction SilentlyContinue

if (-not $SkipInstall) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
    & python -m pip install -r analytics/requirements-native.txt
    if ($LASTEXITCODE -ne 0) {
        throw "Dependency installation failed."
    }
}

$env:DATABASE_URL = $DatabaseUrl
$env:MIGRATIONS_DIR = (Resolve-Path "analytics/db/migrations").Path
$env:STREAMLIT_BROWSER_GATHER_USAGE_STATS = "false"
$env:STREAMLIT_SERVER_HEADLESS = "true"
$env:STREAMLIT_SERVER_SHOW_EMAIL_PROMPT = "false"

# Ensure Streamlit runs non-interactively (no email prompt on first run).
$streamlitDir = Join-Path $HOME ".streamlit"
New-Item -ItemType Directory -Path $streamlitDir -Force | Out-Null
$credentialsToml = Join-Path $streamlitDir "credentials.toml"
@"
[general]
email = ""
"@ | Set-Content -Path $credentialsToml -Encoding ascii

$configToml = Join-Path $streamlitDir "config.toml"
@"
[server]
headless = true
showEmailPrompt = false

[browser]
gatherUsageStats = false
"@ | Set-Content -Path $configToml -Encoding ascii

Write-Host "Starting analytics API on port $ApiPort..." -ForegroundColor Cyan
$apiProc = Start-Process `
    -FilePath "python" `
    -ArgumentList @("-m", "uvicorn", "analytics.api.app:app", "--host", "0.0.0.0", "--port", "$ApiPort") `
    -WorkingDirectory $repoRoot `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $apiOutLog `
    -RedirectStandardError $apiErrLog
$apiProc.Id | Out-File $apiPidFile -Encoding ascii

$healthUrl = "http://localhost:$ApiPort/health"
Write-Host "Waiting for API health: $healthUrl" -ForegroundColor Cyan
$healthy = Wait-ForApiHealth -Url $healthUrl -TimeoutSeconds $HealthTimeoutSeconds
if (-not $healthy) {
    throw "API did not become healthy. Check logs: $apiOutLog and $apiErrLog"
}

Write-Host "Starting dashboard on port $DashboardPort..." -ForegroundColor Cyan
$dashProc = Start-Process `
    -FilePath "python" `
    -ArgumentList @(
        "-m", "streamlit", "run", "analytics/dashboard/app.py",
        "--server.port", "$DashboardPort",
        "--server.address", "0.0.0.0",
        "--browser.gatherUsageStats", "false",
        "--server.headless", "true"
    ) `
    -WorkingDirectory $repoRoot `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $dashOutLog `
    -RedirectStandardError $dashErrLog
$dashProc.Id | Out-File $dashPidFile -Encoding ascii

Write-Host "API:       http://localhost:$ApiPort" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:$DashboardPort" -ForegroundColor Green

if ($SkipTunnel) {
    Write-Host "Tunnel skipped (-SkipTunnel)." -ForegroundColor Yellow
    exit 0
}

if (-not (Get-CommandOrNull "cloudflared")) {
    Write-Warning "cloudflared not found. Install it to expose public webhook URL."
    exit 0
}

Write-Host "Starting Cloudflare quick tunnel..." -ForegroundColor Cyan
$tunnelProc = Start-Process `
    -FilePath "cloudflared" `
    -ArgumentList @("tunnel", "--url", "http://localhost:$ApiPort", "--no-autoupdate") `
    -WorkingDirectory $repoRoot `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelOutLog `
    -RedirectStandardError $tunnelErrLog
$tunnelProc.Id | Out-File $tunnelPidFile -Encoding ascii

$publicBaseUrl = $null
$deadline = (Get-Date).AddSeconds(40)
while ((Get-Date) -lt $deadline -and -not $publicBaseUrl) {
    if ((Test-Path $tunnelOutLog) -or (Test-Path $tunnelErrLog)) {
        $text = ""
        if (Test-Path $tunnelOutLog) {
            $text += Get-Content $tunnelOutLog -Raw -ErrorAction SilentlyContinue
        }
        if (Test-Path $tunnelErrLog) {
            $text += Get-Content $tunnelErrLog -Raw -ErrorAction SilentlyContinue
        }
        if ($text) {
            $match = [regex]::Match($text, "https://[a-zA-Z0-9-]+\.trycloudflare\.com")
            if ($match.Success) {
                $publicBaseUrl = $match.Value
                break
            }
        }
    }
    Start-Sleep -Seconds 1
}

if (-not $publicBaseUrl) {
    Write-Warning "Tunnel started but URL not detected yet. Check: $tunnelOutLog and $tunnelErrLog"
    exit 0
}

$publicEventsUrl = "$publicBaseUrl/events"
$publicEventsUrl | Out-File $urlFile -Encoding ascii

Write-Host ""
Write-Host "Public webhook URL:" -ForegroundColor Green
Write-Host "  $publicEventsUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Use this in external n8n:" -ForegroundColor Cyan
Write-Host "  ANALYTICS_INGEST_URL=$publicEventsUrl"
