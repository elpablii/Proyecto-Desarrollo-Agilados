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

Iniciar el Servidor Backend:
Abre una terminal en la raíz del proyecto y ejecuta:

node backend/api-proxy.js


El servidor estará escuchando en http://localhost:3001.

Servir el Frontend:
Necesitas un servidor web simple para servir los archivos estáticos del frontend. Puedes usar la extensión "Live Server" de VS Code o ejecutar el siguiente comando desde la raíz del proyecto en otra terminal:

npx serve -l 5500


Esto servirá el frontend en http://localhost:5500 (o el puerto que elijas). Asegúrate de que este puerto coincida con la configuración de CORS en el backend si es necesario, y con baseURL si usas Playwright.

Acceder a la aplicación:
Abre tu navegador y ve a http://localhost:5500/frontend/login.html (o la URL correspondiente).

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