param(
    [string]$EndpointUrl,
    [string]$ConversationId = "",
    [string]$CustomerId = "customer-local-test",
    [switch]$UsePublicTunnel
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$urlFile = Join-Path (Join-Path $repoRoot ".runtime") "public_events_url.txt"

if (-not $EndpointUrl -and $UsePublicTunnel) {
    if (Test-Path $urlFile) {
        $EndpointUrl = (Get-Content $urlFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    }
}

if (-not $EndpointUrl) {
    $EndpointUrl = "http://localhost:8000/events"
}

if (-not $ConversationId) {
    $ConversationId = "conv-local-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
}

$payload = @{
    event_type      = "inbound_message"
    conversation_id = $ConversationId
    customer_id     = $CustomerId
    channel         = "whatsapp"
    direction       = "inbound"
    category        = "general"
    metadata        = @{
        source = "manual_test_script"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Posting test event to: $EndpointUrl" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $EndpointUrl -Method POST -ContentType "application/json" -Body $payload
    $response | ConvertTo-Json -Depth 10
}
catch {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Warning "Invoke-RestMethod failed. Retrying with Python requests..."
        $tmpFile = [System.IO.Path]::GetTempFileName()
        $payload | Set-Content -Path $tmpFile -Encoding utf8
        $py = @"
import json
import requests
from pathlib import Path

endpoint = r'''$EndpointUrl'''
payload = json.loads(Path(r'''$tmpFile''').read_text(encoding='utf-8'))
r = requests.post(endpoint, json=payload, timeout=30)
print(json.dumps({"status_code": r.status_code, "body": r.text}))
"@
        $result = $py | python -
        Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
        Write-Output $result
    }
    else {
        throw
    }
}
