# Proyecto Desarrollo Ágil - Avance Curricular

Este proyecto es un sistema de visualización de avance curricular que consume un API proxy para obtener datos académicos simulados de un estudiante. Permite a los usuarios autenticarse, ver sus carreras y consultar la malla curricular correspondiente, destacando visualmente las asignaturas aprobadas, reprobadas o en curso.

## Características

- **Autenticación**: Simulación de inicio de sesión de usuario (basado en backend/sessions.json).
- **Lista de Carreras**: Muestra las carreras asociadas al RUT del usuario.
- **Visualización de Malla**: Renderiza la malla curricular completa de una carrera, agrupada por niveles.
- **Avance Académico**: Superpone el avance del estudiante (aprobados, reprobados, cursando) sobre la malla visual.

## Stack Tecnológico

- **Frontend**: HTML, CSS, JavaScript (Vanilla ES Modules)
- **Backend**: Node.js, Express (API proxy)
- **Orquestación**: Docker, Docker Compose
- **Servidor Frontend**: Nginx (contenedorizado)
- **Testing**: Jest (unitarios), Playwright (E2E)

## 🚀 Inicio Rápido con Docker

Este proyecto está completamente dockerizado y **NO requiere** instalación local de Node.js, npm ni dependencias.

### Prerrequisitos

- ✅ Docker Desktop instalado y en ejecución
- ✅ Docker Compose (incluido con Docker Desktop)

### Configuración de Variables de Entorno (Opcional)

Si necesitas configurar variables de entorno personalizadas:

1. Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` con tus valores (opcional):
   ```bash
   HAWAII_AUTH=tu_token_aqui
   NODE_ENV=production
   PORT=3001
   ```

### Ejecución

#### Opción 1: Scripts de PowerShell (Recomendado para Windows)

1. **Clona el repositorio**:
   ```powershell
   git clone <url-del-repositorio>
   cd Proyecto-Desarrollo-Agilados
   ```

2. **Inicia el proyecto**:
   ```powershell
   .\start.ps1
   ```

3. **Detén el proyecto cuando termines**:
   ```powershell
   .\stop.ps1
   ```

#### Opción 2: Docker Compose (Multiplataforma)

1. **Clona el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd Proyecto-Desarrollo-Agilados
   ```

2. **Construye y levanta los contenedores**:
   ```bash
   docker-compose up --build
   ```

   Este comando:
   - Construye la imagen del backend desde `./backend/Dockerfile`
   - Construye la imagen del frontend desde `./frontend/Dockerfile`
   - Levanta ambos servicios en una red privada de Docker
   - Expone los puertos necesarios en tu máquina local

3. **Accede a la aplicación**:
   
   Una vez que ambos contenedores (`agilados-backend` y `agilados-frontend`) estén en ejecución, abre tu navegador en:

   ```
   http://localhost:5500/login.html
   ```

> 💡 **Tip**: Para una guía más rápida, consulta [QUICKSTART.md](QUICKSTART.md)

### Servicios Disponibles

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:5500 | Interfaz de usuario (Nginx) |
| Backend API | http://localhost:3001 | API proxy (Express) |

### Usuarios de Prueba

Puedes usar las credenciales definidas en `backend/sessions.json`:

- **Usuario**: `maria@example.com`
- **Contraseña**: `pass_maria`


## 🛑 Detener la Aplicación

Para detener los contenedores:

```bash
docker-compose down
```

Para detener y eliminar los volúmenes de datos:

```bash
docker-compose down -v
```

## 🔄 Reconstruir Contenedores

Si realizas cambios en el código, reconstruye las imágenes:

```bash
docker-compose up --build
```

## 🧪 Testing

Los tests se ejecutan contra los contenedores de Docker en ejecución.

### Prerequisitos para Testing

1. **Asegúrate de que los contenedores estén corriendo**:
   ```bash
   docker-compose up
   ```

2. **En una segunda terminal, navega a la carpeta frontend**:
   ```bash
   cd frontend
   ```

3. **Instala las dependencias de testing** (solo la primera vez):
   ```bash
   npm install
   ```

### Ejecutar Tests Unitarios (Jest)

```bash
npm test
```

### Ejecutar Tests End-to-End (Playwright)

```bash
npx playwright test
```


## 📁 Estructura del Proyecto

```
.
├── backend/
│   ├── Dockerfile              # Contenedor del backend
│   ├── .dockerignore           # Archivos excluidos del build
│   ├── index.js                # Punto de entrada del servidor
│   ├── package.json            # Dependencias del backend
│   ├── sessions.json           # Simulación de BD de usuarios
│   ├── proyecciones.json       # Datos de proyecciones
│   ├── controllers/            # Controladores de rutas
│   ├── middleware/             # Middlewares (auth, logging, validation)
│   ├── repositories/           # Acceso a datos
│   ├── routes/                 # Definición de rutas
│   ├── services/               # Lógica de negocio
│   ├── utils/                  # Utilidades
│   └── data/mallas/            # Datos estáticos de mallas
│
├── frontend/
│   ├── Dockerfile              # Contenedor del frontend (Nginx)
│   ├── .dockerignore           # Archivos excluidos del build
│   ├── config.js               # Configuración centralizada
│   ├── login.html              # Página de login
│   ├── authClient.js           # Cliente de autenticación
│   ├── carreras/               # Módulo de carreras
│   ├── malla/                  # Módulo de visualización de malla
│   ├── e2e/                    # Tests E2E (Playwright)
│   ├── __tests__/              # Tests unitarios (Jest)
│   └── package.json            # Dependencias de testing
│
├── docs/
│   └── api-contract.yaml       # Documentación de la API
│
├── docker-compose.yml          # Orquestación de servicios
├── .env.example                # Plantilla de variables de entorno
└── README.md                   # Este archivo
```


## 📡 API Endpoints

El backend expone los siguientes endpoints en `http://localhost:3001`:

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Autentica a un usuario contra sessions.json |
| POST | `/auth/logout` | Invalida el token de sesión |
| GET | `/auth/status` | Verifica la validez de un token de sesión |

### Datos Académicos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/data/carreras/:rut` | Obtiene las carreras asociadas a un RUT |
| GET | `/data/malla/:mallaId` | Obtiene la estructura de la malla curricular |
| GET | `/data/avance/:rut/:codigoCarrera` | Obtiene el avance académico de un estudiante |

### Proyecciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/proyecciones/:rut/:codigo` | Guarda/actualiza una proyección |
| GET | `/proyecciones/:rut/:codigo` | Obtiene la proyección guardada |

Para más detalles, consulta `docs/api-contract.yaml`.

## 🔧 Desarrollo Local (Sin Docker)

Si prefieres desarrollar sin Docker:

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
# Usar un servidor estático simple
npx serve -p 5500
```

**Nota**: El proyecto está optimizado para Docker. El desarrollo local puede requerir ajustes en las configuraciones de CORS y rutas.

## 🐛 Solución de Problemas

### Los contenedores no inician

```bash
# Verifica que Docker Desktop esté corriendo
docker --version
docker-compose --version

# Revisa los logs
docker-compose logs backend
docker-compose logs frontend
```

### Error de puerto en uso

Si los puertos 3001 o 5500 están ocupados:

```bash
# Detén otros servicios o modifica los puertos en docker-compose.yml
# Ejemplo: cambiar "5500:80" a "8080:80"
```

### Los cambios no se reflejan

```bash
# Reconstruye las imágenes sin caché
docker-compose build --no-cache
docker-compose up
```

## 📝 Notas

- Los archivos `sessions.json` y `proyecciones.json` se montan como volúmenes para persistir datos entre reinicios
- El frontend usa configuración dinámica para la URL del backend (ver `frontend/config.js`)
- El proyecto incluye healthchecks para asegurar que el backend esté listo antes de que el frontend se inicie

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request