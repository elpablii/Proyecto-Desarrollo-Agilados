Proyecto Desarrollo Ágil - Avance Curricular

Este proyecto es un sistema de visualización de avance curricular que consume un API proxy para obtener datos académicos simulados de un estudiante. Permite a los usuarios autenticarse, ver sus carreras y consultar la malla curricular correspondiente, destacando visualmente las asignaturas aprobadas, reprobadas o en curso.


Características

Autenticación: Simulación de inicio de sesión de usuario (basado en backend/sessions.json).
Lista de Carreras: Muestra las carreras asociadas al RUT del usuario.
Visualización de Malla: Renderiza la malla curricular completa de una carrera, agrupada por niveles.
Avance Académico: Superpone el avance del estudiante (aprobados, reprobados, cursando) sobre la malla visual.


Stack Tecnológico

Frontend: HTML, CSS, JavaScript (Vanilla ES Modules).
Backend: Node.js, Express (para el proxy API).
Orquestación: Docker, Docker Compose.
Servidor Frontend: Nginx (servido vía Docker).
Testing: Jest (unitarios), Playwright (E2E).


Cómo Empezar (con Docker)

Este proyecto está diseñado para ejecutarse con Docker.


Prerrequisitos

Tener Docker Desktop instalado y en ejecución.


Ejecución

Clona este repositorio.
Abre una terminal en la raíz del proyecto (donde se encuentra docker-compose.yml).
Ejecuta el siguiente comando para construir y levantar los contenedores:
docker-compose up --build

Una vez que ambos contenedores (backend-1 y frontend-1) estén en ejecución, abre la aplicación en tu navegador:

http://localhost:5500/login.html

Los servicios se levantarán en:

Frontend (Nginx): http://localhost:5500
Backend (Proxy API): http://localhost:3001


Usuarios de Prueba

Puedes usar las credenciales definidas en backend/sessions.json para probar. El usuario principal para las pruebas E2E es:

Usuario: maria@example.com
Contraseña: pass_maria


Testing

Los tests se ejecutan contra los contenedores de Docker en ejecución.
Asegúrate de que tus contenedores estén corriendo (docker-compose up).
Abre una segunda terminal y navega a la carpeta frontend:

cd frontend


Instala las dependencias (solo la primera vez):

npm install


Para ejecutar los tests unitarios (Jest):

npm test


Para ejecutar los tests End-to-End (Playwright):

npx playwright test


Estructura del Proyecto

.
├── backend/
│   ├── api-proxy.js      # Servidor proxy de Node.js
│   ├── Dockerfile        # Definición del contenedor del backend
│   ├── sessions.json     # Simulación de BD de usuarios y avance
│   └── data/mallas/      # Archivos JSON de mallas (datos estáticos)
│
├── frontend/
│   ├── carreras/
│   │   ├── carrerasUsuario.html
│   │   └── carrerasUsuario.js
│   ├── malla/            # (NUEVO)
│   │   ├── mallaCarrera.html   # Página de visualización de malla
│   │   ├── mallaCarrera.js     # Lógica para renderizar la malla
│   │   └── mallaClient.js      # Cliente para endpoints de malla
│   ├── e2e/
│   │   └── auth-career.spec.js # Test E2E (actualizado)
│   ├── __tests__/
│   │   ├── mallaClient.test.js # (NUEVO) Test unitario
│   │   └── proyeccion.test.js
│   ├── authClient.js         # Cliente de autenticación
│   ├── login.html            # Página de login
│   └── ...
│
├── docs/
│   └── api-contract.yaml # Documentación de los endpoints
│
└── docker-compose.yml      # Orquestador de Docker


API Endpoints (Proxy)

El backend (api-proxy.js) expone los siguientes endpoints en http://localhost:3001:


Autenticación

POST /login

Autentica a un usuario contra sessions.json.

Respuesta: { success: true, token: "...", rut: "..." }

POST /logout

Invalida el token de sesión.

GET /session

Verifica la validez de un token de sesión.


Datos Académicos

GET /carreras/:rut

Obtiene las carreras asociadas a un RUT (desde sessions.json).

GET /malla/:mallaId

Obtiene la estructura de la malla (ej. 8266-202410).

Proxy de backend/data/mallas/.

GET /avance/:rut/:codigoCarrera

Obtiene el avance académico de un estudiante (desde sessions.json)