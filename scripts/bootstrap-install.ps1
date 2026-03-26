$ErrorActionPreference = 'Stop'

param(
    [string]$TargetDir = 'QuestionBankDB'
)

$RepoUrl = 'https://github.com/Shlol762/QuestionBankDB.git'
$Branch = 'Live-Version'
$ZipUrl = 'https://github.com/Shlol762/QuestionBankDB/archive/refs/heads/Live-Version.zip'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Error: Missing required command '$Name'."
    }
}

function Clone-WithGit {
    Write-Host "Cloning repository into '$TargetDir'..."
    & git clone --depth 1 --branch $Branch $RepoUrl $TargetDir
    if ($LASTEXITCODE -ne 0) {
        throw 'git clone failed.'
    }
}

function Clone-WithZip {
    $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("qdb-bootstrap-" + [Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null

    try {
        $zipPath = Join-Path $tmpDir 'repo.zip'
        Write-Host "Downloading repository archive into '$TargetDir'..."
        Invoke-WebRequest $ZipUrl -OutFile $zipPath

        Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force
        $extracted = Join-Path $tmpDir 'QuestionBankDB-Live-Version'

        if (-not (Test-Path $extracted)) {
            throw 'Could not unpack repository archive.'
        }

        Move-Item -Path $extracted -Destination $TargetDir
    }
    finally {
        if (Test-Path $tmpDir) {
            Remove-Item -Path $tmpDir -Recurse -Force
        }
    }
}

if (Test-Path $TargetDir) {
    $compose = Join-Path $TargetDir 'docker-compose.production.yml'
    $installer = Join-Path $TargetDir 'scripts/install.ps1'

    if ((Test-Path $compose) -and (Test-Path $installer)) {
        Write-Host "Using existing project directory '$TargetDir'."
    }
    else {
        throw "Error: Target directory '$TargetDir' already exists but is not a QuestionBankDB repository. Choose a different directory or remove it, then retry."
    }
}
else {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Clone-WithGit
    }
    else {
        Clone-WithZip
    }
}

Set-Location $TargetDir
Write-Host 'Starting project installer...'
& powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
