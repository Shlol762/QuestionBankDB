$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ComposeFile = Join-Path $RootDir 'docker-compose.production.yml'
$EnvFile = Join-Path $RootDir '.env.production'
$ExampleEnvFile = Join-Path $RootDir '.env.production.example'
$ProjectName = ((Split-Path -Leaf $RootDir).ToLower() -replace '[^a-z0-9]', '')
$DbVolumeName = "$ProjectName`_questiondb_postgres_data"

function Assert-ProjectRoot {
        $missing = @()
        if (-not (Test-Path $ComposeFile)) { $missing += 'docker-compose.production.yml' }
        if (-not (Test-Path $ExampleEnvFile)) { $missing += '.env.production.example' }
        if (-not (Test-Path (Join-Path $RootDir 'Dockerfile.backend'))) { $missing += 'Dockerfile.backend' }
        if (-not (Test-Path (Join-Path $RootDir 'Dockerfile.frontend'))) { $missing += 'Dockerfile.frontend' }
        if (-not (Test-Path (Join-Path $RootDir 'src'))) { $missing += 'src/' }
        if (-not (Test-Path (Join-Path $RootDir 'frontend'))) { $missing += 'frontend/' }

        if ($missing.Count -gt 0) {
                throw @"
Error: Installer must be run from the QuestionBankDB repository root.
Missing required project files/directories: $($missing -join ', ')

Fix:
    git clone https://github.com/Shlol762/QuestionBankDB.git
    cd QuestionBankDB
    powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
"@
        }
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        if ($Name -eq 'docker') {
            throw @"
Error: Missing required command 'docker'.

Install Docker Desktop (includes Docker Engine + Compose), then retry.
Download: https://www.docker.com/products/docker-desktop/

After install, verify:
  docker --version
  docker compose version
"@
        }
        throw "Error: Missing required command '$Name'."
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

function Show-InstallPlan {
    Write-Host 'Install plan (host machine):'
    Write-Host "  - Creates/updates only: $EnvFile"
    Write-Host '  - Creates Docker volumes: questiondb_postgres_data, questiondb_uploads_data'
    Write-Host '  - Creates Docker images/containers via docker compose'
    Write-Host '  - Does NOT install system packages on host'
    Write-Host ''
    Write-Host 'Expected network downloads:'
    Write-Host '  - Docker base images (postgres, python, nginx, node)'
    Write-Host '  - Python and npm packages inside image builds'
    Write-Host ''
}

function Show-BackendDiagnostics {
    Write-Host ''
    Write-Host 'Startup diagnostics:'
    & docker compose --env-file $EnvFile -f $ComposeFile ps
    Write-Host '--- backend logs (last 200 lines) ---'
    & docker compose --env-file $EnvFile -f $ComposeFile logs --tail=200 backend
    Write-Host '--- postgres logs (last 80 lines) ---'
    & docker compose --env-file $EnvFile -f $ComposeFile logs --tail=80 postgres
    Write-Host ''
}

function Assert-NoVolumeCredentialConflict {
    if (Test-Path $EnvFile) {
        return
    }

    & docker volume inspect $DbVolumeName *> $null
    if ($LASTEXITCODE -eq 0) {
        throw @"
Error: Existing database volume detected: $DbVolumeName
No .env.production file found, so generating new DB credentials would break startup against existing data.

Choose one option:
  1) Reuse old credentials: restore previous .env.production in this folder and rerun install
  2) Fresh install (delete old DB data):
     docker compose -f $ComposeFile down -v --remove-orphans
     docker volume rm $DbVolumeName
     powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
"@
    }
}

Require-Command 'docker'
Assert-ProjectRoot
Show-InstallPlan

& docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    throw @"
Error: Docker Compose plugin is missing.

Install or repair Docker Desktop, then verify:
  docker compose version
"@
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw @"
Error: Docker daemon is not running or current user cannot access Docker.

Start Docker Desktop and retry.
"@
}

Assert-NoVolumeCredentialConflict

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
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compose reported a startup failure (exit $LASTEXITCODE)."
    Show-BackendDiagnostics
    exit 1
}

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
    Show-BackendDiagnostics
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
