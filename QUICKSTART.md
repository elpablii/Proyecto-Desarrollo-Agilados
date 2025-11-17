# 🚀 Inicio Rápido - Proyecto Desarrollo Agilados

## ⚡ Ejecución en 3 pasos

### 1. Asegúrate de que Docker Desktop esté corriendo
   - Abre Docker Desktop
   - Espera a que esté completamente iniciado (icono en la barra de tareas)

### 2. Inicia el proyecto
   ```powershell
   .\start.ps1
   ```

### 3. Accede a la aplicación
   - Frontend: http://localhost:5500/login.html
   - Backend API: http://localhost:3001

## 🛑 Para detener la aplicación
```powershell
.\stop.ps1
```

## 👤 Credenciales de prueba
- **Usuario**: maria@example.com
- **Contraseña**: pass_maria

## 📝 Comandos útiles

### Ver logs en tiempo real
```powershell
docker-compose logs -f
```

### Ver logs de un servicio específico
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Reconstruir sin caché
```powershell
docker-compose build --no-cache
docker-compose up
```

### Ver contenedores en ejecución
```powershell
docker ps
```

## ❓ Problemas comunes

### "Docker no está corriendo"
→ Abre Docker Desktop y espera a que inicie completamente

### "Puerto en uso"
→ Detén otros servicios en los puertos 3001 o 5500
→ O modifica los puertos en `docker-compose.yml`

### "Los cambios no se reflejan"
→ Ejecuta: `docker-compose up --build`

## 📖 Documentación completa
Ver `README.md` para más detalles sobre testing, estructura y desarrollo.
