$ErrorActionPreference = 'Stop'

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

if (-not (Test-Path $BackupDir)) {
    New-Item -Path $BackupDir -ItemType Directory | Out-Null
}

$envMap = Read-EnvMap $EnvFile
$dbUser = $envMap['POSTGRES_USER']
$dbName = $envMap['POSTGRES_DB']
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$outFile = Join-Path $BackupDir "questionbank_$timestamp.sql"

Write-Host "Creating backup: $outFile"
$dump = & docker compose --project-name $ComposeProjectName --env-file $EnvFile -f $ComposeFile exec -T postgres pg_dump -U $dbUser -d $dbName
$dump | Out-File -FilePath $outFile -Encoding utf8

Write-Host "Backup complete: $outFile"
