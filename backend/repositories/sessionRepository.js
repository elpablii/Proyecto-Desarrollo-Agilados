const fs = require('fs');
const path = require('path');
// [NUEVO] Importar la utilidad de escritura atómica
const { atomicWriteFile } = require('../utils/helpers');

// Ubicación del archivo de datos
const SESSIONS_FILE = path.join(__dirname, '..', 'sessions.json');

// Almacén de sesiones en memoria (simulando una caché de BD)
const sessions = new Map();

/**
 * Carga las sesiones desde el archivo JSON a la memoria.
 */
const loadSessionsFromDisk = () => {
    // ... (código existente sin cambios)
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            const now = Date.now();
            for (const s of parsed) {
                // Restaurar solo sesiones no expiradas
                if (s.expiresAt && s.expiresAt > now) {
                    sessions.set(s.id, s);
                }
            }
            console.log(`[INFO] Repositorio: Cargadas ${sessions.size} sesiones desde disco`);
        }
    } catch (err) {
        console.warn('[WARN] Repositorio: No se pudieron cargar sesiones desde disco:', err.message);
    }
};

/**
 * [MODIFICADO] Persiste el estado actual de la caché de sesiones al archivo JSON.
 * Ahora es asíncrono y atómico.
 */
const saveSessionsToDisk = async () => {
    try {
        const arr = Array.from(sessions.values());
        const data = JSON.stringify(arr, null, 2);
        // Usa la nueva utilidad de escritura atómica
        await atomicWriteFile(SESSIONS_FILE, data);
    } catch (err) {
        console.warn('[WARN] Repositorio: No se pudieron guardar sesiones en disco:', err.message);
    }
};

// --- Interfaz del Repositorio ---

/**
 * Busca una sesión por su ID.
 * @param {string} id 
 * @returns {object | null} La sesión, o null si no se encuentra.
 */
const findById = (id) => {
    return sessions.get(id) || null;
};
// ... (findById, findByToken sin cambios) ...
const findByToken = (token) => {
    for (const session of sessions.values()) {
        if (session.token === token) {
            return session;
        }
    }
    return null;
};

/**
 * [MODIFICADO] Guarda (crea o actualiza) una sesión.
 * Ahora es asíncrono.
 * @param {object} session 
 */
const save = async (session) => {
    if (!session || !session.id) {
        throw new Error('Se requiere un objeto de sesión con ID para guardar.');
    }
    sessions.set(session.id, session);
    // Persistir en cada guardado (ahora es asíncrono)
    await saveSessionsToDisk();
};

/**
 * [MODIFICADO] Elimina una sesión por su ID.
 * Ahora es asíncrono.
 * @param {string} id 
 */
const deleteById = async (id) => {
    const deleted = sessions.delete(id);
    if (deleted) {
        // Persistir el cambio (ahora es asíncrono)
        await saveSessionsToDisk();
    }
    return deleted;
};

/**
 * Devuelve todas las sesiones (para limpieza).
 * @returns {IterableIterator<object>}
 */
const findAll = () => {
    return sessions.values();
};

module.exports = {
    loadSessionsFromDisk,
    findById,
    findByToken,
    save,
    deleteById,
    findAll
};