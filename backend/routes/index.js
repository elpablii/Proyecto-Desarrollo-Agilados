// Enrutador principal
const express = require('express');
const router = express.Router();

// Importar enrutadores específicos
const authRoutes = require('./authRoutes');
const dataRoutes = require('./dataRoutes');
const proyeccionRoutes = require('./proyeccionRoutes');

// Definir rutas base
router.use('/', authRoutes); // Rutas de autenticación (ej. /login, /logout)
router.use('/', dataRoutes); // Rutas de datos (ej. /carreras, /malla, /avance)
router.use('/proyeccion', proyeccionRoutes); // Rutas de proyecciones

module.exports = router;