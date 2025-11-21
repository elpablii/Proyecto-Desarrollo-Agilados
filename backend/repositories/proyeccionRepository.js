const fs = require('fs');
const path = require('path');
// [NUEVO] Importar la utilidad de escritura atómica
const { atomicWriteFile } = require('../utils/helpers');

const PROYECCIONES_FILE = path.join(__dirname, '..', 'proyecciones.json');
let proyecciones = []; // Caché en memoria de proyecciones

const loadProyeccionesFromDisk = () => {
    // ... (código existente sin cambios)
    try {
        if (fs.existsSync(PROYECCIONES_FILE)) {
            const raw = fs.readFileSync(PROYECCIONES_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) proyecciones = parsed;
            console.log(`[INFO] Repositorio: Cargadas ${proyecciones.length} proyecciones desde disco`);
        }
    } catch (err) {
        console.warn('[WARN] Repositorio: No se pudieron cargar proyecciones desde disco:', err.message);
    }
};

/**
 * [MODIFICADO] Persiste el estado actual de la caché de proyecciones al archivo JSON.
 * Ahora es asíncrono y atómico.
 */
const saveProyeccionesToDisk = async () => {
    try {
        const data = JSON.stringify(proyecciones, null, 2);
        // Usa la nueva utilidad de escritura atómica
        await atomicWriteFile(PROYECCIONES_FILE, data);
    } catch (err) {
        console.warn('[WARN] Repositorio: No se pudieron guardar proyecciones en disco:', err.message);
    }
};

// --- Interfaz del Repositorio ---

/**
 * [MODIFICADO] Guarda una proyección.
 * Ahora es asíncrono.
 */
const save = async (projectionData) => {
    proyecciones.push(projectionData);
    await saveProyeccionesToDisk(); // Espera a que se guarde
    return projectionData;
};

const findByUser = (userId, codigoCarrera) => {
    // ... (código existente sin cambios)
    return proyecciones.filter(p => 
        p.userId === userId && 
        (!codigoCarrera || p.codigoCarrera === codigoCarrera)
    );
};

const findById = (id) => {
    // ... (código existente sin cambios)
    return proyecciones.find(p => p.id === id);
};

const deleteById = async (id) => {
    const initialLength = proyecciones.length;
    // Filtrar para quitar el elemento con ese ID
    proyecciones = proyecciones.filter(p => p.id !== id);
    
    // Si la longitud cambió, significa que borramos algo
    if (proyecciones.length !== initialLength) {
        await saveProyeccionesToDisk(); // Persistir cambios
        return true;
    }
    return false; // No se encontró
};

module.exports = {
    loadProyeccionesFromDisk,
    save,
    findByUser,
    findById,
    deleteById
};