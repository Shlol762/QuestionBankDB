$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ComposeFile = Join-Path $RootDir 'docker-compose.production.yml'
$EnvFile = Join-Path $RootDir '.env.production'

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

if (-not (Test-Path $EnvFile)) {
    throw "Missing $EnvFile. Run scripts/install.ps1 first."
}

if (-not (Test-Path $BackupFile)) {
    throw "Backup file not found: $BackupFile"
}

$envMap = Read-EnvMap $EnvFile
$dbUser = $envMap['POSTGRES_USER']
$dbName = $envMap['POSTGRES_DB']

Write-Host "Restoring database from: $BackupFile"
Get-Content -Path $BackupFile -Raw | & docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres psql -U $dbUser -d $dbName

Write-Host 'Restore complete.'
