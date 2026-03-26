$ErrorActionPreference = 'Stop'

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
"@
    }

    $dockerInfoOutput = & docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        if (($dockerInfoOutput | Out-String) -match 'Access is denied|permission denied') {
            throw @"
Error: Docker is installed but this user cannot access Docker.
Fix:
  - Start Docker Desktop
  - Re-open terminal with appropriate privileges
  - Verify with: docker info
"@
        }

        throw @"
Error: Docker daemon is not available.
Fix:
  - Start Docker Desktop
  - Verify with: docker info
"@
    }
}

Set-StrictMode -Version Latest

$RepoOwner = 'Shlol762'
$RepoName = 'QuestionBankDB'
$Branch = 'Live-Version'
$ArchiveUrl = "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$Branch.tar.gz"

$TargetArg = if ($args.Count -gt 0 -and $args[0]) { $args[0] } else { Join-Path $PWD 'QuestionBankDB' }
if ([System.IO.Path]::IsPathRooted($TargetArg)) {
    $TargetDir = [System.IO.Path]::GetFullPath($TargetArg)
} else {
    $TargetDir = [System.IO.Path]::GetFullPath((Join-Path $PWD $TargetArg))
}

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

function Sync-FromGitHubArchive {
    $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null

    try {
        Write-Host "Downloading latest $RepoName ($Branch) from GitHub..."
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

        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

        foreach ($path in $RuntimePaths) {
            $source = Join-Path $extractedDir.FullName $path
            $target = Join-Path $TargetDir $path

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

Require-Command 'docker'
Require-Command 'tar'
Test-DockerReady

Write-Host "Install target: $TargetDir"
Write-Host "Source: $ArchiveUrl"

Sync-FromGitHubArchive

Write-Host 'Running update script to build/start services...'
& (Join-Path $TargetDir 'scripts/update.ps1')

Write-Host "Install complete in: $TargetDir"
