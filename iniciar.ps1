param([switch]$SinAbrir)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Inicia Docker Desktop antes de ejecutar este archivo.' }
    docker compose up -d --build --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el proyecto. Revisa docker compose logs.' }
    $taskPort = '5173'
    if (Test-Path -LiteralPath '.env') {
        $taskPortLine = Get-Content -LiteralPath '.env' | Where-Object { $_ -match '^WEB_PORT=\d+$' } | Select-Object -First 1
        if ($taskPortLine) { $taskPort = ($taskPortLine -split '=', 2)[1] }
    }
    Write-Host "Enlace está disponible en http://localhost:$taskPort" -ForegroundColor Green
    if (-not $SinAbrir) { Start-Process "http://localhost:$taskPort" }
} finally { Pop-Location }
