# Script para detener el proyecto
# Ejecutar: .\stop.ps1

Write-Host "🛑 Deteniendo Proyecto Desarrollo Agilados..." -ForegroundColor Yellow
Write-Host ""

docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Contenedores detenidos correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar nuevamente, ejecuta: .\start.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Hubo un error al detener los contenedores" -ForegroundColor Red
}
