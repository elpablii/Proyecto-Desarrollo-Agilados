const express = require('express');
const router = express.Router();
const { handleLogin, handleLogout, getAuthStatus } = require('../controllers/authController');
const { authenticateSession } = require('../middleware/authMiddleware');

// --- Rutas de Autenticación ---
router.post('/login', handleLogin);
router.post('/logout', handleLogout);
router.get('/auth/status', authenticateSession, getAuthStatus); // Protegida

module.exports = router;