param(
    [switch]$SkipBuild,
    [switch]$SkipTunnel,
    [int]$HealthTimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

function Get-CommandOrNull {
    param([string]$Name)
    return Get-Command $Name -ErrorAction SilentlyContinue
}

function Read-EnvFile {
    param([string]$Path)

    $map = @{}
    if (-not (Test-Path $Path)) {
        return $map
    }

    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
            continue
        }
        $parts = $trimmed -split "=", 2
        if ($parts.Count -eq 2) {
            $map[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
    return $map
}

function Wait-ForApiHealth {
    param(
        [string]$Url,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 5
            if ($response.status -eq "ok") {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

function Stop-ExistingTunnel {
    param([string]$PidFile)

    if (-not (Test-Path $PidFile)) {
        return
    }

    $oldPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($oldPid) {
        $oldProcess = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($oldProcess) {
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$runtimeDir = Join-Path $repoRoot ".runtime"
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

if (-not (Get-CommandOrNull "docker")) {
    throw "Docker is not installed or not in PATH. Install Docker Desktop, then re-run this script."
}

& docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose plugin is not available. Install/enable Docker Compose, then re-run this script."
}

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example" -ForegroundColor Yellow
    }
    else {
        throw ".env and .env.example were not found."
    }
}

$envMap = Read-EnvFile -Path ".env"
$apiPort = if ($envMap.ContainsKey("ANALYTICS_API_PORT")) { [int]$envMap["ANALYTICS_API_PORT"] } else { 8000 }
$dashboardPort = if ($envMap.ContainsKey("ANALYTICS_DASHBOARD_PORT")) { [int]$envMap["ANALYTICS_DASHBOARD_PORT"] } else { 8501 }

$composeArgs = @("compose", "up", "-d")
if (-not $SkipBuild) {
    $composeArgs += "--build"
}

Write-Host "Starting postgres + analytics API + dashboard..." -ForegroundColor Cyan
& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed."
}

$healthUrl = "http://localhost:$apiPort/health"
Write-Host "Waiting for API health: $healthUrl" -ForegroundColor Cyan
$isHealthy = Wait-ForApiHealth -Url $healthUrl -TimeoutSeconds $HealthTimeoutSeconds
if (-not $isHealthy) {
    throw "API did not become healthy within $HealthTimeoutSeconds seconds."
}

Write-Host "API is healthy." -ForegroundColor Green
Write-Host "Dashboard: http://localhost:$dashboardPort" -ForegroundColor Green

if ($SkipTunnel) {
    Write-Host "Tunnel skipped (-SkipTunnel)." -ForegroundColor Yellow
    exit 0
}

if (-not (Get-CommandOrNull "cloudflared")) {
    throw "cloudflared is not installed or not in PATH. Install Cloudflare Tunnel client or run with -SkipTunnel."
}

$pidFile = Join-Path $runtimeDir "cloudflared.pid"
$outLogFile = Join-Path $runtimeDir "cloudflared.out.log"
$errLogFile = Join-Path $runtimeDir "cloudflared.err.log"
$urlFile = Join-Path $runtimeDir "public_events_url.txt"

Stop-ExistingTunnel -PidFile $pidFile
Remove-Item $outLogFile -Force -ErrorAction SilentlyContinue
Remove-Item $errLogFile -Force -ErrorAction SilentlyContinue
Remove-Item $urlFile -Force -ErrorAction SilentlyContinue

$localApiBase = "http://localhost:$apiPort"
Write-Host "Starting Cloudflare quick tunnel to $localApiBase ..." -ForegroundColor Cyan
$tunnelProcess = Start-Process `
    -FilePath "cloudflared" `
    -ArgumentList @("tunnel", "--url", $localApiBase, "--no-autoupdate") `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLogFile `
    -RedirectStandardError $errLogFile

$tunnelProcess.Id | Out-File $pidFile -Encoding ascii

$publicBaseUrl = $null
$tunnelDeadline = (Get-Date).AddSeconds(40)
while ((Get-Date) -lt $tunnelDeadline -and -not $publicBaseUrl) {
    if ((Test-Path $outLogFile) -or (Test-Path $errLogFile)) {
        $logText = ""
        if (Test-Path $outLogFile) {
            $logText += Get-Content $outLogFile -Raw -ErrorAction SilentlyContinue
        }
        if (Test-Path $errLogFile) {
            $logText += Get-Content $errLogFile -Raw -ErrorAction SilentlyContinue
        }
        if ($logText) {
            $match = [regex]::Match($logText, "https://[a-zA-Z0-9-]+\.trycloudflare\.com")
            if ($match.Success) {
                $publicBaseUrl = $match.Value
                break
            }
        }
    }
    Start-Sleep -Seconds 1
}

if (-not $publicBaseUrl) {
    Write-Warning "Tunnel started but public URL was not detected yet. Check: $outLogFile and $errLogFile"
    Write-Host "If available later, use: <public-url>/events for ANALYTICS_INGEST_URL in n8n."
    exit 0
}

$publicEventsUrl = "$publicBaseUrl/events"
$publicEventsUrl | Out-File $urlFile -Encoding ascii

Write-Host ""
Write-Host "Public webhook endpoint ready:" -ForegroundColor Green
Write-Host "  $publicEventsUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Set this in n8n (external server):" -ForegroundColor Cyan
Write-Host "  ANALYTICS_INGEST_URL=$publicEventsUrl"
Write-Host ""
Write-Host "Tunnel logs: $outLogFile and $errLogFile"
Write-Host "To stop everything: .\\scripts\\stop-analytics-local.ps1"
