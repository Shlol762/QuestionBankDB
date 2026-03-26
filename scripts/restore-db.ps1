$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ComposeFile = Join-Path $RootDir 'docker-compose.production.yml'
$EnvFile = Join-Path $RootDir '.env.production'

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
Get-Content -Path $BackupFile -Raw | & docker compose --project-name $ComposeProjectName --env-file $EnvFile -f $ComposeFile exec -T postgres psql -U $dbUser -d $dbName

Write-Host 'Restore complete.'
