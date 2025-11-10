const express = require('express');
const router = express.Router();
const { getCarreras, getMalla, getAvance } = require('../controllers/dataController');
const { authenticateSession } = require('../middleware/authMiddleware');

// --- Importar validación ---
const { mallaRules, carrerasRules, avanceRules } = require('../utils/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// --- Rutas de Datos Académicos ---

// Endpoint de Malla (Público) con validación
router.get('/malla/:mallaId', mallaRules(), handleValidationErrors, getMalla);

// Endpoints Protegidos con validación
router.get('/carreras/:rut', authenticateSession, carrerasRules(), handleValidationErrors, getCarreras);
router.get('/avance/:rut/:codigoCarrera', authenticateSession, avanceRules(), handleValidationErrors, getAvance);

module.exports = router;