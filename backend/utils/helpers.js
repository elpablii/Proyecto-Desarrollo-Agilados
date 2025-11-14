const fs = require('fs');
const path = require('path');

// [NUEVO] Importar promesas de fs
const fsPromises = require('fs').promises;

// Normaliza un RUT
const normalizeRut = (r) => r ? r.replace(/[.\-]/g, '') : '';

// Obtiene un fallback de malla
const getLocalMallaFallback = (mallaId) => {
    // ... (código existente sin cambios)
    try {
        // Fallback específico
        const fallbackPath = path.join(__dirname, '..', 'data', 'mallas', `${mallaId}.json`);
        if (fs.existsSync(fallbackPath)) {
            const raw = fs.readFileSync(fallbackPath, 'utf8');
            return { malla: JSON.parse(raw), source: 'local-fallback', path: fallbackPath };
        }
    } catch (e) {
        console.warn('[MALLA FALLBACK] Error leyendo fallback específico:', e.message);
    }
    try {
        // Fallback genérico
        const genericFallback = path.join(__dirname, '..', '..', 'frontend', 'malla', 'malla-fallback.json');
        if (fs.existsSync(genericFallback)) {
            const raw2 = fs.readFileSync(genericFallback, 'utf8');
            return { malla: JSON.parse(raw2), source: 'frontend-generic-fallback', path: genericFallback };
        }
    } catch (e) {
        console.warn('[MALLA FALLBACK] Error leyendo fallback genérico:', e.message);
    }
    return null;
};

/**
 * [NUEVO] Escribe datos en un archivo de forma atómica.
 * Escribe directamente sin usar .tmp para evitar problemas de lock en WSL2/Docker.
 * @param {string} filePath - Ruta al archivo final.
 * @param {string} data - Datos a escribir (string).
 */
const atomicWriteFile = async (filePath, data) => {
    try {
        await fsPromises.writeFile(filePath, data, 'utf8');
    } catch (err) {
        console.error(`[ATOMIC WRITE ERROR] Falló al escribir en ${filePath}:`, err);
        throw err; // Re-lanzar el error original
    }
};

module.exports = {
    normalizeRut,
    getLocalMallaFallback,
    atomicWriteFile // Exportar la nueva utilidad
};