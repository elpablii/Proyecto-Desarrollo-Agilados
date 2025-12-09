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

const getLocalAvanceFallback = (rut, codigoCarrera) => {
    try {
        const fallbackPath = path.join(__dirname, '..', 'data', 'avances', `${rut}-${codigoCarrera}.json`);
        if (fs.existsSync(fallbackPath)) {
            const raw = fs.readFileSync(fallbackPath, 'utf8');
            return { avance: JSON.parse(raw), source: 'local-fallback', path: fallbackPath };
        }
    } catch (e) {
        console.warn('[AVANCE FALLBACK] Error leyendo fallback:', e.message);
    }
    return null;
};

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
    getLocalAvanceFallback,
    atomicWriteFile
};