$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ComposeFile = Join-Path $RootDir 'docker-compose.production.yml'
$EnvFile = Join-Path $RootDir '.env.production'
$ExampleEnvFile = Join-Path $RootDir '.env.production.example'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Read-EnvMap([string]$Path) {
    $map = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $parts = $line.Split('=', 2)
            $map[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
    return $map
}

Require-Command 'docker'

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker daemon is not running. Start Docker and retry.'
}

if (-not (Test-Path $EnvFile)) {
    Copy-Item $ExampleEnvFile $EnvFile

    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object {[char]$_})
    $secret = [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

    $content = Get-Content $EnvFile -Raw
    $content = $content -replace 'POSTGRES_PASSWORD=replace_me_with_strong_password', "POSTGRES_PASSWORD=$dbPassword"
    $content = $content -replace 'POSTGRES_URL=postgresql\+asyncpg://questionbank:replace_me_with_strong_password@postgres:5432/questionbank', "POSTGRES_URL=postgresql+asyncpg://questionbank:$dbPassword@postgres:5432/questionbank"
    $content = $content -replace 'SECRET_KEY=replace_me_with_long_random_secret', "SECRET_KEY=$secret"
    Set-Content -Path $EnvFile -Value $content -NoNewline

    Write-Host "Generated $EnvFile with secure defaults."
}

Write-Host 'Building and starting services...'
& docker compose --env-file $EnvFile -f $ComposeFile up -d --build

Write-Host 'Waiting for backend health endpoint...'
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
    Write-Host 'Backend health check failed. Inspect logs with:'
    Write-Host "docker compose --env-file $EnvFile -f $ComposeFile logs --tail=100"
    exit 1
}

$envMap = Read-EnvMap $EnvFile
$frontendPort = if ($envMap.ContainsKey('FRONTEND_PORT') -and $envMap['FRONTEND_PORT']) { $envMap['FRONTEND_PORT'] } else { '80' }

Write-Host 'Install complete.'
if ($frontendPort -eq '80') {
    Write-Host 'Frontend: http://127.0.0.1'
} else {
    Write-Host "Frontend: http://127.0.0.1:$frontendPort"
}
Write-Host 'Backend API: http://127.0.0.1:8000/docs'
