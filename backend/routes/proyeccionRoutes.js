const express = require('express');
const router = express.Router();
const { saveProyeccion, listProyecciones, getProyeccion } = require('../controllers/proyeccionController');
const { authenticateSession } = require('../middleware/authMiddleware');

// --- Rutas de Proyecciones (Todas protegidas) ---
router.use(authenticateSession); // Aplica autenticación a todas las rutas de este archivo

router.post('/', saveProyeccion);
router.get('/', listProyecciones);
router.get('/:id', getProyeccion);
// Nota: Faltarían PUT (actualizar) y DELETE si se quisiera completar el CRUD

module.exports = router;