const { body, param } = require('express-validator');

/**
 * Reglas para POST /login
 */
const loginRules = () => [
    body('email', 'Email inválido')
        .isEmail()
        .normalizeEmail(), // Sanitización: Pone el email en minúsculas.
    body('password', 'La contraseña no puede estar vacía')
        .notEmpty()
        .trim() // Sanitización: Quita espacios en blanco.
        .escape() // Sanitización: Convierte <, >, & a entidades HTML.
];

/**
 * Reglas para GET /malla/:mallaId
 */
const mallaRules = () => [
    param('mallaId', 'Formato de ID de malla inválido. Use {codigo}-{catalogo}')
        .matches(/^\d+-\d+$/)
        .trim()
        .escape()
];

/**
 * Reglas para GET /carreras/:rut
 */
const carrerasRules = () => [
    param('rut', 'RUT inválido')
        .notEmpty()
        .trim()
        .escape() // Sanitiza aunque la lógica de normalización ya lo limpia.
];

/**
 * Reglas para GET /avance/:rut/:codigoCarrera
 */
const avanceRules = () => [
    param('rut', 'RUT inválido')
        .notEmpty()
        .trim()
        .escape(),
    param('codigoCarrera', 'Código de carrera inválido')
        .isNumeric() // Asegura que sea un número
        .trim()
        .escape()
];

/**
 * Reglas para POST /proyeccion
 */
const saveProyeccionRules = () => [
    body('codigoCarrera', 'codigoCarrera es requerido y debe ser numérico')
        .notEmpty()
        .isNumeric()
        .trim()
        .escape(),
    body('name', 'Nombre inválido')
        .optional() // Permite que sea nulo o no venga
        .trim()
        .escape(), // ¡Sanitización clave para prevenir XSS!
    body('projection', 'La proyección es requerida y debe ser un array')
        .notEmpty()
        .isArray()
];

/**
 * Reglas para GET /proyeccion/:id
 */
const getProyeccionRules = () => [
    param('id', 'ID de proyección inválido')
        .isHexadecimal() // Basado en cómo se genera el ID (crypto)
        .isLength({ min: 16, max: 16 }) // crypto.randomBytes(8).toString('hex') = 16 chars
        .trim()
];

module.exports = {
    loginRules,
    mallaRules,
    carrerasRules,
    avanceRules,
    saveProyeccionRules,
    getProyeccionRules
};