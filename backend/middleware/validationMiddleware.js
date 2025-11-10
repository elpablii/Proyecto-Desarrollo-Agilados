const { validationResult } = require('express-validator');

/**
 * Middleware para manejar los errores de validación detectados por express-validator.
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('[VALIDATION ERROR]', errors.array());
        // Responde con 400 (Bad Request) si hay errores
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    handleValidationErrors
};