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
Then rerun installer:
    powershell -ExecutionPolicy Bypass -Command "Invoke-Expression ((Invoke-WebRequest https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/scripts/install.ps1).Content)"
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
Then rerun installer:
    powershell -ExecutionPolicy Bypass -Command "Invoke-Expression ((Invoke-WebRequest https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/scripts/install.ps1).Content)"
Raw error:
$($dockerInfoOutput | Out-String)
"@
    }
}

Set-StrictMode -Version Latest

function Get-ProjectHash([string]$Path) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Path)
    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    try {
        $hashBytes = $sha1.ComputeHash($bytes)
    }
    finally {
        $sha1.Dispose()
    }
    $hex = ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').ToLower()
    return $hex.Substring(0, 8)
}

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

$ProjectHash = Get-ProjectHash $TargetDir
$ComposeProjectName = "questionbankdb_$ProjectHash"
$DbVolumeName = "$ComposeProjectName`_postgres_data"
$CredentialCacheDir = Join-Path $env:USERPROFILE '.questionbankdb'
$CredentialCacheFile = Join-Path $CredentialCacheDir "$ComposeProjectName.env.production"

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

if (-not (Test-Path (Join-Path $TargetDir '.env.production'))) {
    $existingVolume = docker volume ls -q --filter "name=^${DbVolumeName}$"
    if ($existingVolume) {
        if (Test-Path $CredentialCacheFile) {
            Copy-Item $CredentialCacheFile (Join-Path $TargetDir '.env.production') -Force
            Write-Host "Recovered DB credentials from cache: $CredentialCacheFile"
        }
        else {
        throw @"
Error: Existing database volume detected: $DbVolumeName
No .env.production found, and generating a new password would break DB authentication.
No credential cache found at: $CredentialCacheFile

Choose one option:
1) Reuse existing data: restore prior .env.production for this install directory, then rerun install.
2) Fresh install (data loss):
    docker compose --project-name $ComposeProjectName -f $(Join-Path $TargetDir 'docker-compose.production.yml') down -v --remove-orphans
   docker volume rm $DbVolumeName
   powershell -ExecutionPolicy Bypass -Command "Invoke-Expression ((Invoke-WebRequest https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/scripts/install.ps1).Content)"
"@
        }
    }
}

if (Test-Path (Join-Path $TargetDir '.env.production')) {
    if (-not (Test-Path $CredentialCacheDir)) {
        New-Item -ItemType Directory -Path $CredentialCacheDir | Out-Null
    }
    Copy-Item (Join-Path $TargetDir '.env.production') $CredentialCacheFile -Force
}

Write-Host 'Running update script to build/start services...'
& (Join-Path $TargetDir 'scripts/update.ps1')

Write-Host "Install complete in: $TargetDir"
