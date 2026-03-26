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
        throw "Error: Missing required command '$Name'."
    }
}

function Sync-FromGitHubArchive {
    $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null

    try {
        Write-Host "Syncing runtime files from GitHub ($Branch)..."
        $archivePath = Join-Path $tmpDir 'repo.tar.gz'
        Invoke-WebRequest -Uri $ArchiveUrl -OutFile $archivePath -UseBasicParsing

        tar -xzf $archivePath -C $tmpDir

        $extractedDir = Get-ChildItem -Path $tmpDir -Directory | Where-Object { $_.Name -like "$RepoName-*" } | Select-Object -First 1
        if (-not $extractedDir) {
            throw 'Failed to extract repository archive from GitHub.'
        }

        foreach ($path in $RuntimePaths) {
            $source = Join-Path $extractedDir.FullName $path
            $target = Join-Path $RootDir $path

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
