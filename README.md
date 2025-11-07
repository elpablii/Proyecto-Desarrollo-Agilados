## Proyecto Académico Agilados

Este repositorio contiene una aplicación académica de demostración para visualizar mallas curriculares, revisar el avance académico y planear proyecciones de ramos por semestre. Está pensada para uso local y demo: incluye fallbacks para poder probar la UI sin depender de servicios externos.

Este README explica, paso a paso y con comandos concretos para PowerShell (Windows), cómo ejecutar el proyecto en desarrollo y en Docker, cómo ejecutar tests y cómo diagnosticar los problemas más comunes.

### Requisitos previos

- Node.js 18+ (recomendado).
- npm (incluido con Node.js).
- Docker & Docker Compose (opcional, para correr el backend en contenedor).

Si trabajas en Windows PowerShell: los ejemplos de comandos en este README están formateados para esa shell.

### Estructura importante

- `backend/` - servidor Express que hace de proxy y persistencia dev (ficheros JSON).
- `frontend/` - aplicación estática (HTML + ES Modules + Tailwind).
- `dev-static-server.js` - pequeño servidor estático usado en desarrollo para servir `frontend` en http://localhost:5500.
- `backend/data/mallas/` y `frontend/malla/malla-fallback.json` - mallas de fallback para demo.

## Ejecutar en desarrollo (sin Docker)

1) Clonar el repositorio

```powershell
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_CARPETA_PROYECTO>
```

2) Instalar dependencias

Instala las dependencias del backend y del frontend (ambas carpetas tienen package.json). Desde la raíz del repo:

```powershell
cd backend
npm install
cd ../frontend
npm install
cd ..
```

3) (Opcional) Setear variables de entorno

Si quieres que el backend intente usar el servicio externo de mallas, exporta el token en `HAWAII_AUTH`. Para pruebas locales sin token no es obligatorio porque existen fallbacks.

```powershell
# $env:HAWAII_AUTH = 'TU_TOKEN_AQUI'   # sólo si tienes uno
```

4) Iniciar el backend

Hay dos formas:

- A) Ejecutar directamente con Node (rápido durante desarrollo):

```powershell
# Desde la raíz del repo
node backend/api-proxy.js
```

Esto levantará el backend en http://localhost:3001 (puerto por defecto).

- B) (Alternativa) Ejecutar en modo debug con nodemon si lo deseas:

```powershell
# Instala nodemon global o en devDependencies y ejecuta
npx nodemon --watch backend backend/api-proxy.js
```

5) Iniciar el frontend (archivos estáticos)

Recomendado: usar el servidor estático incluido para desarrollo:

```powershell
# Desde la raíz del repo
node dev-static-server.js
```

Esto sirve `dePrueba.html` y los assets estáticos en http://localhost:5500.

Alternativa: usar `npx serve` desde la carpeta `frontend`:

```powershell
cd frontend
npx serve -l 5500
```

6) Abrir la aplicación

- Dashboard/demo: http://localhost:5500/dePrueba.html
- Malla (demo/fallback): http://localhost:5500/malla/mallaCarrera.html

Si ves la pantalla de login, autenticación y sesiones de desarrollo están disponibles en el backend. Para probar sin login, usa el botón de "Ver demo (malla fallback)" dentro de `mallaCarrera.html`.

## Ejecutar con Docker (backend en contenedor)

Si prefieres usar Docker para el backend, sigue estos pasos. Esto deja persistencia de los archivos de sesiones/proyecciones en el host y facilita levantar el servicio.

1) (Opcional) Exporta el token `HAWAII_AUTH` si lo tienes:

```powershell
# $env:HAWAII_AUTH = 'TU_TOKEN_AQUI'
```

2) Construir la imagen del backend y levantar el servicio con docker compose

```powershell
# Desde la raíz del repo
docker compose build backend
docker compose up -d backend
```

3) Ver logs del backend

```powershell
docker compose logs --tail 200 backend
```

4) Parar y limpiar

```powershell
docker compose down
```

Notas sobre Docker:

- `docker-compose.yml` en este repo monta `./backend/sessions.json` y `./backend/proyecciones.json` dentro del contenedor para mantener persistencia en el host (modo desarrollo).
- El backend quedará accesible en http://localhost:3001.

## Pruebas

Unit tests (frontend - Jest)

```powershell
cd frontend
npm test
```

E2E tests (Playwright)

```powershell
cd frontend
npx playwright test
# o para la UI
npx playwright test --ui
```

## Fallos comunes y cómo diagnosticarlos

1) 401/403 al cargar una malla en la UI

- Causa habitual: sesión desincronizada entre cookie del backend y `sessionStorage.userRut` del frontend.
- Solución rápida: en el navegador abre DevTools → Application (Storage) → Clear site data (borrar cookies + localStorage + sessionStorage). Luego recarga la página y loguea nuevamente.
- Alternativa: usa una ventana de navegación privada/Incógnito para evitar datos en cache.

2) La app muestra un 200 en backend pero la UI no se actualiza

- Abre la consola del navegador (F12) y revisa la pestaña Network para ver la llamada a `/malla/<id>`. Observa el código HTTP y el cuerpo.

3) 404 en assets (por ejemplo `Escudo-UCN-Full-Color.png`)

- No es crítico para la lógica, pero añade ruido en logs. Añade el asset faltante en `frontend/` o elimina la referencia en el HTML si lo deseas.

4) No hay fallback para una malla concreta

- El backend incluye algunos fallback JSON en `backend/data/mallas/`. Si una malla no tiene fallback, puedes copiar `frontend/malla/malla-fallback.json` a `backend/data/mallas/<mallaId>.json` para pruebas locales.

Ejemplo PowerShell para crear un fallback al vuelo:

```powershell
Copy-Item frontend\malla\malla-fallback.json backend\data\mallas\8616-202310.json
```

## Endpoints relevantes (resumen)

- POST /login — inicia sesión (dev) y establece cookie `ucn_session`.
- POST /logout — elimina la sesión.
- GET /auth/status — devuelve estado de sesión y `userId`.
- GET /carreras/:rut — lista de carreras del usuario (requiere sesión válida).
- GET /malla/:mallaId — devuelve malla; si el servicio externo falla, el backend intentará servir un fallback local.
- POST /proyeccion, GET /proyeccion[?codigo], GET /proyeccion/:id — endpoints dev para persistir proyecciones de usuarios (guardadas en `backend/proyecciones.json`).

Consulta `docs/api-contract.yaml` para la especificación OpenAPI completa.

## Desarrollo y depuración rápida

- Reiniciar backend cuando hagas cambios:

```powershell
# Si estás ejecutando directamente con node, detén y vuelve a iniciar
# Si usas Docker
docker compose restart backend
```

- Ver logs del backend para ver llamadas autorizadas / errores:

```powershell
docker compose logs --tail 200 backend
# o cuando ejecutas node localmente revisa la salida de la terminal donde se está ejecutando
```

## Contribuir / buenas prácticas

- No añadir credenciales o sesiones reales al repo. Mantener `backend/sessions.json` y `backend/proyecciones.json` fuera del control de versiones.
- Para producción sustituir la persistencia por una base de datos y usar un mecanismo de sesiones seguro (Redis/DB + cookies seguras).

## Resumen rápido (la receta mínima)

1) Instala dependencias:

```powershell
cd backend; npm install; cd ../frontend; npm install; cd ..
```

2) Lanza backend (local):

```powershell
node backend/api-proxy.js
```

3) Lanza frontend (local):

```powershell
node dev-static-server.js
```

4) Abre http://localhost:5500/dePrueba.html y prueba la vista de malla o el demo fallback.


Si quieres, puedo agregar instrucciones concretas para crear sesiones de prueba (ej.: cómo copiar una cookie de `backend/sessions.json` a tu navegador) o automatizar la copia del fallback para mallas que estén fallando. ¿Te gustaría que añada eso al README también?

Proyecto Académico Agilados (Proyecto Desarrollo )

Descripción

Este proyecto es un sitio web académico diseñado para estudiantes, permitiéndoles visualizar su progreso académico, planificar sus próximos semestres y generar proyecciones de finalización de carrera. Los usuarios pueden ver sus mallas curriculares, el estado actual de sus asignaturas, y crear/guardar diferentes escenarios de proyección basados en los créditos y prerrequisitos de los ramos. El sistema también incluye lógica para generar proyecciones automáticas, considerando alertas académicas (como asignaturas en cuarto intento) y el perfil de egreso.

El desarrollo se realiza utilizando el marco de trabajo Scrum.

Tecnologías Utilizadas

Backend: Node.js, Express.js, Cors, Cookie-Parser

Frontend: HTML, Vanilla JavaScript (ES Modules), Tailwind CSS

Testing:

Unit Testing: Jest

E2E Testing: Playwright

API Documentation: OpenAPI (YAML)

Estructura del Proyecto

.
├── backend/              # Lógica del servidor (API Proxy)
│   ├── api-proxy.js      # Servidor Express principal
│   ├── package.json      # Dependencias del backend
│   └── sessions.json     # (Opcional, Desarrollo) Almacenamiento de sesiones
├── docs/                 # Documentación
│   └── api-contract.yaml # Definición OpenAPI de la API
├── frontend/             # Lógica e interfaz de usuario (Cliente web)
│   ├── __tests__/        # Tests unitarios (Jest)
│   ├── carreras/         # Lógica/HTML específico de carreras
│   ├── e2e/              # Tests End-to-End (Playwright)
│   ├── authClient.js     # Cliente para autenticación
│   ├── careerDetailsClient.js # Cliente para datos de carrera
│   ├── login.html        # Página de inicio de sesión
│   ├── dePrueba.html     # Página principal post-login (puede renombrarse)
│   ├── package.json      # Dependencias y scripts del frontend
│   └── ...               # Otros archivos JS, HTML
├── .gitignore            # Archivos ignorados por Git
├── README.md             # Este archivo
└── package.json          # Dependencias generales (si aplica)


(Nota: La estructura puede variar después de la limpieza de archivos sugerida)

Instalación

Prerrequisitos:

Node.js (Se recomienda versión 18 o superior)

npm (usualmente viene con Node.js)

Pasos:

Clonar el repositorio:

git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_CARPETA_PROYECTO>


Instalar dependencias del Backend:

cd backend
npm install
cd ..


(Nota: Si tienes dependencias en la raíz también, ejecuta npm install en la carpeta raíz)

Instalar dependencias del Frontend:

cd frontend
npm install
cd ..


Ejecución (Modo Desarrollo)

Arrancar el proyecto localmente — pasos rápidos

1) Preparar dependencias

En la raíz del repo instala dependencias del backend y frontend cuando corresponda:

```powershell
cd backend
npm install
cd ../frontend
npm install
cd ..
```

2) Variables de entorno (opcional)

Para producción o si tu entorno requiere un token para el servicio externo de mallas, exporta la variable `HAWAII_AUTH` antes de arrancar el backend. Ejemplo (PowerShell):

```powershell
$env:HAWAII_AUTH = 'TU_TOKEN_AQUI'
```

3) Iniciar el backend (API proxy)

Abre una terminal y ejecuta desde la raíz del proyecto:

```powershell
# Inicia el servidor API
node backend/api-proxy.js
```

El backend escucha por defecto en: http://localhost:3001

4) Iniciar el frontend (archivos estáticos)

Tienes dos opciones para servir la carpeta `frontend`:

- Opción A — servidor minimal incluido (recomendado para desarrollo local):

```powershell
# Desde la raíz del repo
node dev-static-server.js
```

Esto sirve `dePrueba.html` en http://localhost:5500.

- Opción B — usar `npx serve` (si lo prefieres):

```powershell
cd frontend
npx serve -l 5500
```

Si el puerto 5500 está en uso, `serve` elegirá otro puerto y te lo mostrará en la salida; usa la URL que muestre en la terminal.

5) Abrir la aplicación en el navegador

- Dashboard/demo: http://localhost:5500/dePrueba.html
- Malla (demo/fallback): http://localhost:5500/malla/mallaCarrera.html

Nota: Si abres `mallaCarrera.html` sin parámetros verás un botón "Ver demo (malla fallback)" que carga una malla de ejemplo.

Sesiones de desarrollo

Durante desarrollo el backend persiste sesiones en `backend/sessions.json` y proyecciones en `backend/proyecciones.json`. Ambos archivos están añadidos a `.gitignore` para evitar subir datos sensibles. En producción deberías usar un almacén seguro (Redis/DB) y eliminar cualquier archivo con datos reales del repo.

Seguridad rápida

- No subas `backend/sessions.json`, `backend/proyecciones.json` ni archivos `.env` al repositorio.
- Mueve tokens o credenciales a variables de entorno (`HAWAII_AUTH`, etc.) y configura un store seguro para sesiones en producción.

Docker (backend)

También puedes ejecutar el backend en un contenedor Docker. Se incluyen:

- `backend/Dockerfile` — imagen para el servicio backend
- `docker-compose.yml` — configuración para levantar el servicio y persistir archivos de sesión/proyecciones (desarrollo)

Construir y levantar con Docker Compose:

```powershell
# Desde la raíz del repo
docker compose build backend
docker compose up -d backend
```

El contenedor expondrá el puerto 3001 en el host (http://localhost:3001).

Notas:
- `docker-compose.yml` monta `./backend/sessions.json` y `./backend/proyecciones.json` dentro del contenedor para que los datos persistan en el host durante el desarrollo.
- Para pasar el token `HAWAII_AUTH` al contenedor puedes exportarlo en tu shell antes de arrancar Docker Compose, por ejemplo:

```powershell
$env:HAWAII_AUTH = 'TU_TOKEN'
docker compose up -d backend
```

Para detener y limpiar el contenedor:

```powershell
docker compose down
```

Ejecución de Pruebas

Tests Unitarios (Frontend):
Navega a la carpeta frontend y ejecuta:

npm test


Esto correrá los tests definidos con Jest.

Tests End-to-End (Frontend):
Asegúrate de que el backend y el frontend estén ejecutándose (o usa la configuración webServer de Playwright). Navega a la carpeta frontend y ejecuta:

npx playwright test


Para ver la interfaz gráfica de Playwright:

npx playwright test --ui


API

La API expuesta por el backend (api-proxy.js) actúa como intermediario para obtener los datos académicos.

Definición OpenAPI: El contrato formal de la API se encuentra en docs/api-contract.yaml.

Endpoints Principales:

POST /login: Autentica al usuario y establece una cookie de sesión.

POST /logout: Cierra la sesión del usuario.

GET /auth/status: Verifica si la sesión actual es válida.

GET /carreras/{rut}: Obtiene los detalles de las carreras asociadas a un RUT (requiere autenticación).