const express = require('express');
const router = express.Router();
const { getCarreras, getMalla, getAvance } = require('../controllers/dataController');
const { authenticateSession } = require('../middleware/authMiddleware');

// --- Importar validación ---
const { mallaRules, carrerasRules, avanceRules } = require('../utils/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// --- Rutas de Datos Académicos ---

// Endpoint de Malla (Público) con validación - separated codigo and catalogo parameters
router.get('/data/malla/:codigo/:catalogo', mallaRules(), handleValidationErrors, getMalla);

// Endpoints Protegidos con validación
router.get('/data/carreras/:rut', authenticateSession, carrerasRules(), handleValidationErrors, getCarreras);
router.get('/data/avance/:rut/:codigoCarrera', authenticateSession, avanceRules(), handleValidationErrors, getAvance);

module.exports = router;