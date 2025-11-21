const express = require('express');
const router = express.Router();
const { saveProyeccion, listProyecciones, getProyeccion, deleteProyeccion } = require('../controllers/proyeccionController');
const { authenticateSession } = require('../middleware/authMiddleware');

// --- Importar validación ---
const { saveProyeccionRules, getProyeccionRules } = require('../utils/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// --- Rutas de Proyecciones (Todas protegidas) ---
router.use(authenticateSession); // Aplica autenticación a todas

router.post('/', saveProyeccionRules(), handleValidationErrors, saveProyeccion);
router.get('/', listProyecciones); // GET (Listar) no necesita validación estricta de query params
router.get('/:id', getProyeccionRules(), handleValidationErrors, getProyeccion);

router.delete('/:id', getProyeccionRules(), handleValidationErrors, deleteProyeccion);

module.exports = router;