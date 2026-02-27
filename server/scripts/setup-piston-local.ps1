param(
    [switch]$SkipRuntimeInstall,
    [string]$ComposeFile = "",
    [string]$ContainerName = "studyweb-piston"
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing command: $Name. Please install it before continuing."
    }
}

Require-Command "docker"

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
    $ComposeFile = Join-Path $PSScriptRoot "..\..\docker-compose.piston.yml"
}

if (-not (Test-Path $ComposeFile)) {
    throw "Compose file not found: $ComposeFile"
}
$ComposeFile = (Resolve-Path $ComposeFile).Path

Write-Host "Starting local Piston with compose file: $ComposeFile"
docker compose -f $ComposeFile up -d

$healthUrl = "http://127.0.0.1:2000/api/v2/runtimes"
$maxWaitSeconds = 120
$ready = $false

for ($i = 0; $i -lt ($maxWaitSeconds / 2); $i++) {
    try {
        $null = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    throw "Piston API is not reachable at $healthUrl after $maxWaitSeconds seconds."
}

if (-not $SkipRuntimeInstall) {
    $packages = @("javascript", "typescript", "python", "java", "gcc")
    foreach ($pkg in $packages) {
        Write-Host "Installing runtime package: $pkg"
        try {
            docker exec $ContainerName node /piston/cli/index.js -u http://localhost:2000 ppman install $pkg
        } catch {
            Write-Warning "Failed to install package '$pkg'. You can retry manually."
        }
    }
}

$runtimes = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 10
$languages = @($runtimes | ForEach-Object { $_.language } | Sort-Object -Unique)

Write-Host ""
Write-Host "Piston is up."
Write-Host "Runtimes detected: $($languages -join ', ')"
Write-Host "Set CODE_RUNNER_API_URL=http://127.0.0.1:2000/api/v2/execute if needed."
