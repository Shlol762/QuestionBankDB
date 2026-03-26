$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ComposeFile = Join-Path $RootDir 'docker-compose.production.yml'
$EnvFile = Join-Path $RootDir '.env.production'

if (-not (Test-Path $EnvFile)) {
    throw "Missing $EnvFile. Run scripts/install.ps1 first."
}

Write-Host 'Step 1/4: Creating pre-update database backup...'
& (Join-Path $RootDir 'scripts/backup-db.ps1')

Write-Host 'Step 2/4: Pulling latest images (if available)...'
& docker compose --env-file $EnvFile -f $ComposeFile pull

Write-Host 'Step 3/4: Rebuilding/restarting services...'
& docker compose --env-file $EnvFile -f $ComposeFile up -d --build

Write-Host 'Step 4/4: Verifying backend health...'
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $healthy) {
    Write-Host 'Update verification failed. Inspect logs with:'
    Write-Host "docker compose --env-file $EnvFile -f $ComposeFile logs --tail=200"
    exit 1
}

Write-Host 'Update complete.'
