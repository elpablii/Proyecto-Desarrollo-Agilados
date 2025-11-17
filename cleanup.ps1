# Script para limpiar archivos innecesarios del proyecto
# OPCIONAL - Solo ejecutar si quieres eliminar archivos legacy
# Ejecutar: .\cleanup.ps1

Write-Host "🧹 Limpieza de Archivos Innecesarios" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script eliminará archivos que ya no son necesarios" -ForegroundColor Yellow
Write-Host "después de la migración completa a Docker." -ForegroundColor Yellow
Write-Host ""

$filesToRemove = @(
    "dev-static-server.js",
    "tailwind.config.js",
    "package.json",
    "package-lock.json",
    "node_modules"
)

Write-Host "Archivos a eliminar:" -ForegroundColor White
foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file (existe)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (no existe)" -ForegroundColor Gray
    }
}

Write-Host ""
$confirm = Read-Host "¿Deseas continuar con la eliminación? (s/N)"

if ($confirm -eq "s" -or $confirm -eq "S") {
    Write-Host ""
    Write-Host "Eliminando archivos..." -ForegroundColor Yellow
    
    foreach ($file in $filesToRemove) {
        if (Test-Path $file) {
            Remove-Item $file -Recurse -Force
            Write-Host "  ✅ Eliminado: $file" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "✅ Limpieza completada" -ForegroundColor Green
    Write-Host ""
    Write-Host "Archivos de imágenes/memes (Coquimbo-ok.jpg, etc.) se mantuvieron." -ForegroundColor Cyan
    Write-Host "Si deseas eliminarlos, hazlo manualmente." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
}

Write-Host ""
Read-Host "Presiona Enter para salir"
