# WhatsApp AI Analytics Stack

This stack now supports two modes:

- Native local mode (no Docker): SQLite + local Python services.
- Docker mode (for server deployment later): PostgreSQL + containers.

## 1) Native Local Mode (No Docker)

### Prerequisites

- Python 3.11+ in PATH
- PowerShell
- `cloudflared` (optional, only if you need external n8n to reach your local API)

### Start

From project root:

```powershell
.\scripts\start-analytics-native.ps1
```

This will:

1. Install required Python packages (unless you pass `-SkipInstall`).
2. Run API locally on `http://localhost:8000`.
3. Run dashboard locally on `http://localhost:8501`.
4. Use SQLite file DB at `./analytics/local_analytics.db`.
5. Start Cloudflare quick tunnel (unless you pass `-SkipTunnel`) and print public `/events` URL.

### Stop

```powershell
.\scripts\stop-analytics-native.ps1
```

### n8n (external server) webhook URL

Use the tunnel URL printed by the start script:

- `ANALYTICS_INGEST_URL=https://<random>.trycloudflare.com/events`

### Quick test event

```powershell
.\scripts\test-analytics-webhook.ps1
```

or:

```powershell
.\scripts\test-analytics-webhook.ps1 -UsePublicTunnel
```

or explicit URL:

```powershell
.\scripts\test-analytics-webhook.ps1 -EndpointUrl "https://<random>.trycloudflare.com/events"
```

## 2) Docker Mode (Later Deployment)

### Prerequisites

- Docker Desktop with Docker Compose

### Start

```powershell
.\scripts\start-analytics-local.ps1
```

### Stop

```powershell
.\scripts\stop-analytics-local.ps1
```

## Verification Checklist

1. Open dashboard `http://localhost:8501`.
2. Send one test event.
3. Confirm KPI cards update.
4. Save token pricing in sidebar.
5. Confirm input/output/total token cost updates.
6. Confirm escalation table fills when escalation events are sent.
