const express = require('express');
const router = express.Router();
const { getCarreras, getMalla, getAvance } = require('../controllers/dataController');
const { authenticateSession } = require('../middleware/authMiddleware');

// --- Rutas de Datos Académicos ---

// Endpoint de Malla (Público)
router.get('/malla/:mallaId', getMalla);

// Endpoints Protegidos (Requieren sesión)
router.get('/carreras/:rut', authenticateSession, getCarreras);
router.get('/avance/:rut/:codigoCarrera', authenticateSession, getAvance);

module.exports = router;