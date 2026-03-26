$ErrorActionPreference = 'Stop'

param(
    [switch]$PurgeData,
    [switch]$PurgeBackups,
    [switch]$RemoveEnv,
    [switch]$PruneImages
)

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ComposeFile = Join-Path $RootDir 'docker-compose.production.yml'
$EnvFile = Join-Path $RootDir '.env.production'
$BackupDir = Join-Path $RootDir 'backups'

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

$ProjectHash = Get-ProjectHash $RootDir
$ComposeProjectName = "questionbankdb_$ProjectHash"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Missing required command: docker'
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker daemon is not running. Start Docker and retry.'
}

$prevEA = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

if ($PurgeData) {
    Write-Host 'Running uninstall with data purge...'
    & docker compose --project-name $ComposeProjectName --env-file $EnvFile -f $ComposeFile down -v --remove-orphans
} else {
    Write-Host 'Running safe uninstall (data preserved)...'
    & docker compose --project-name $ComposeProjectName --env-file $EnvFile -f $ComposeFile down --remove-orphans
}

$ErrorActionPreference = $prevEA

if ($PurgeBackups -and (Test-Path $BackupDir)) {
    Remove-Item -Path $BackupDir -Recurse -Force
    Write-Host "Removed backups directory: $BackupDir"
}

if ($RemoveEnv -and (Test-Path $EnvFile)) {
    Remove-Item -Path $EnvFile -Force
    Write-Host "Removed env file: $EnvFile"
}

if ($PruneImages) {
    $prevEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & docker image prune -f | Out-Null
    $ErrorActionPreference = $prevEA
    Write-Host 'Pruned dangling Docker images.'
}

Write-Host 'Uninstall/cleanup complete.'
