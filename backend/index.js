// Import necessary modules
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// [NUEVO] Cargar variables de entorno desde .env (para desarrollo local)
// Docker-compose lo hace automáticamente, pero esto es para 'npm start'
// Apuntamos al .env en la raíz del proyecto (un nivel arriba de /backend)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Importar REPOSITORIOS (para carga inicial)
const { loadSessionsFromDisk } = require('./repositories/sessionRepository');
const { loadProyeccionesFromDisk } = require('./repositories/proyeccionRepository');

// Importar middlewares
const { loggingMiddleware } = require('./middleware/loggingMiddleware');

// Importar rutas
const apiRoutes = require('./routes');

// Initialize Express app
const app = express();

// --- Middleware setup ---
app.use(express.json()); // Parse JSON bodies
app.use(cors({
    origin: [ // Allow requests from these frontend origins
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true // Allow sending cookies
}));
app.use(cookieParser()); // Parse cookies
app.use(loggingMiddleware); // Middleware de logging

// --- Carga Inicial de Datos ---
// Cargar sesiones y proyecciones desde los repositorios al iniciar
try {
    loadSessionsFromDisk();
} catch (err) {
    console.warn('[WARN] No se pudieron cargar sesiones desde disco:', err.message);
}

try {
    loadProyeccionesFromDisk();
} catch (err) {
    console.warn('[WARN] No se pudieron cargar proyecciones desde disco:', err.message);
}

// --- Rutas ---
// Usar el enrutador principal para todas las rutas de la API
app.use('/', apiRoutes);

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[INFO] Backend intermedio (refactorizado) corriendo en http://localhost:${PORT}`);
});