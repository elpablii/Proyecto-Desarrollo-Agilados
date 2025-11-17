# Script para iniciar el proyecto con Docker
# Ejecutar: .\start.ps1

Write-Host "🚀 Iniciando Proyecto Desarrollo Agilados..." -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker esté corriendo
Write-Host "Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Docker Desktop no está corriendo." -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor:" -ForegroundColor Yellow
    Write-Host "1. Abre Docker Desktop" -ForegroundColor White
    Write-Host "2. Espera a que esté completamente iniciado" -ForegroundColor White
    Write-Host "3. Ejecuta este script nuevamente" -ForegroundColor White
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ Docker está corriendo" -ForegroundColor Green
Write-Host ""

# Construir y levantar contenedores
Write-Host "Construyendo y levantando contenedores..." -ForegroundColor Yellow
docker-compose up --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Aplicación iniciada correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Accede a la aplicación en:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://localhost:5500/login.html" -ForegroundColor White
    Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Hubo un error al iniciar los contenedores" -ForegroundColor Red
    Write-Host "Revisa los logs arriba para más detalles" -ForegroundColor Yellow
}
