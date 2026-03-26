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

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Missing required command: docker'
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker daemon is not running. Start Docker and retry.'
}

if ($PurgeData) {
    Write-Host 'Running uninstall with data purge...'
    & docker compose --env-file $EnvFile -f $ComposeFile down -v --remove-orphans
} else {
    Write-Host 'Running safe uninstall (data preserved)...'
    & docker compose --env-file $EnvFile -f $ComposeFile down --remove-orphans
}

if ($PurgeBackups -and (Test-Path $BackupDir)) {
    Remove-Item -Path $BackupDir -Recurse -Force
    Write-Host "Removed backups directory: $BackupDir"
}

if ($RemoveEnv -and (Test-Path $EnvFile)) {
    Remove-Item -Path $EnvFile -Force
    Write-Host "Removed env file: $EnvFile"
}

if ($PruneImages) {
    & docker image prune -f | Out-Null
    Write-Host 'Pruned dangling Docker images.'
}

Write-Host 'Uninstall/cleanup complete.'
