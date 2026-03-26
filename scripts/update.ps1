$ErrorActionPreference = 'Stop'

Set-StrictMode -Version Latest

$RepoOwner = 'Shlol762'
$RepoName = 'QuestionBankDB'
$Branch = 'Live-Version'
$ArchiveUrl = "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$Branch.tar.gz"

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ComposeFile = Join-Path $RootDir 'docker-compose.production.yml'
$EnvFile = Join-Path $RootDir '.env.production'
$ExampleEnvFile = Join-Path $RootDir '.env.production.example'

$RuntimePaths = @(
    'scripts',
    'src',
    'frontend',
    'docker-compose.production.yml',
    'Dockerfile.backend',
    'Dockerfile.frontend',
    'requirements.txt',
    'alembic.ini',
    '.dockerignore',
    '.env.production.example'
)

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        $hint = switch ($Name) {
            'docker' { 'Install Docker Desktop (includes Docker Engine + Compose).' }
            'tar' { 'Install tar support or use a modern PowerShell/Windows build with bsdtar.' }
            default { '' }
        }
        if ($hint) {
            throw "Error: Missing required command '$Name'. $hint"
        }
        throw "Error: Missing required command '$Name'."
    }
}

function Test-DockerReady {
        $composeOutput = & docker compose version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw @"
Error: Docker Compose plugin is missing.
Fix: install/update Docker Desktop, then verify with:
  docker compose version
Raw error:
$($composeOutput | Out-String)
"@
    }

    $dockerInfoOutput = & docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        if (($dockerInfoOutput | Out-String) -match 'Access is denied|permission denied') {
            throw @"
Error: Docker is installed but this user cannot access Docker.
Fix - copy/paste these commands in PowerShell:
    Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    Start-Sleep -Seconds 10
    docker info
If still failing, close/reopen terminal as your regular user and try again.
Then rerun update:
    powershell -ExecutionPolicy Bypass -Command "Invoke-Expression ((Invoke-WebRequest https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/scripts/update.ps1).Content)"
Raw error:
$($dockerInfoOutput | Out-String)
"@
        }

        throw @"
Error: Docker daemon is not available.
Fix - copy/paste these commands in PowerShell:
    Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    Start-Sleep -Seconds 10
    docker info
Then rerun update:
    powershell -ExecutionPolicy Bypass -Command "Invoke-Expression ((Invoke-WebRequest https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/scripts/update.ps1).Content)"
Raw error:
$($dockerInfoOutput | Out-String)
"@
    }
}

function Sync-FromGitHubArchive {
    $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null

    try {
        Write-Host "Syncing runtime files from GitHub ($Branch)..."
        $archivePath = Join-Path $tmpDir 'repo.tar.gz'
                try {
                        Invoke-WebRequest -Uri $ArchiveUrl -OutFile $archivePath -UseBasicParsing -TimeoutSec 120
                }
                catch {
                        throw @"
Error: Failed to download project archive from GitHub.
Check internet/DNS access and verify URL:
    $ArchiveUrl
Original error: $($_.Exception.Message)
"@
                }

        tar -xzf $archivePath -C $tmpDir

        $extractedDir = Get-ChildItem -Path $tmpDir -Directory | Where-Object { $_.Name -like "$RepoName-*" } | Select-Object -First 1
        if (-not $extractedDir) {
            throw 'Failed to extract repository archive from GitHub.'
        }

        foreach ($path in $RuntimePaths) {
            $source = Join-Path $extractedDir.FullName $path
            $target = Join-Path $RootDir $path

            if (-not (Test-Path $source)) {
                throw "GitHub archive is missing required path: $path"
            }

            if (Test-Path $target) {
                Remove-Item -Path $target -Recurse -Force
            }

            Copy-Item -Path $source -Destination $target -Recurse -Force
        }
    }
    finally {
        if (Test-Path $tmpDir) {
            Remove-Item -Path $tmpDir -Recurse -Force
        }
    }
}

function Ensure-EnvFile {
    if (Test-Path $EnvFile) {
        return
    }

    if (-not (Test-Path $ExampleEnvFile)) {
        throw "Missing $ExampleEnvFile after sync."
    }

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

Require-Command 'docker'
Require-Command 'tar'
Test-DockerReady

Sync-FromGitHubArchive
Ensure-EnvFile

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

Write-Host 'Step 1/4: Creating pre-update database backup...'
if (-not (Test-Path (Join-Path $RootDir 'scripts/backup-db.ps1'))) {
    throw "Missing backup helper: $(Join-Path $RootDir 'scripts/backup-db.ps1'). Run install again to restore runtime files."
}
& (Join-Path $RootDir 'scripts/backup-db.ps1')

Write-Host 'Step 2/4: Pulling latest images (if available)...'
& docker compose --env-file $EnvFile -f $ComposeFile pull

Write-Host 'Step 3/4: Rebuilding/restarting services...'
& docker compose --env-file $EnvFile -f $ComposeFile up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compose reported a startup failure (exit $LASTEXITCODE)."
    Show-BackendDiagnostics
    exit 1
}

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
    Show-BackendDiagnostics
    exit 1
}

Write-Host 'Update complete.'
