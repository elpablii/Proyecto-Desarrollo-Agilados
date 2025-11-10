const express = require('express');
const router = express.Router();
const { handleLogin, handleLogout, getAuthStatus } = require('../controllers/authController');
const { authenticateSession } = require('../middleware/authMiddleware');

// --- Importar validación ---
const { loginRules } = require('../utils/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// --- Rutas de Autenticación ---
// Aplicar reglas de validación ANTES del controlador
router.post('/login', loginRules(), handleValidationErrors, handleLogin);

router.post('/logout', handleLogout);
router.get('/auth/status', authenticateSession, getAuthStatus); // Protegida

module.exports = router;