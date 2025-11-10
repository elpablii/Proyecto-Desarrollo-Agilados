const fs = require('fs');
const path = require('path');

// Ubicación del archivo de datos
const SESSIONS_FILE = path.join(__dirname, '..', 'sessions.json');

// Almacén de sesiones en memoria (simulando una caché de BD)
const sessions = new Map();

/**
 * Carga las sesiones desde el archivo JSON a la memoria.
 */
const loadSessionsFromDisk = () => {
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
 * Persiste el estado actual de la caché de sesiones al archivo JSON.
 */
const saveSessionsToDisk = () => {
    try {
        const arr = Array.from(sessions.values());
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(arr, null, 2), 'utf8');
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

/**
 * Busca una sesión por el token de fallback.
 * (Ineficiente, pero sigue la lógica original)
 * @param {string} token 
 * @returns {object | null} La sesión, o null si no se encuentra.
 */
const findByToken = (token) => {
    for (const session of sessions.values()) {
        if (session.token === token) {
            return session;
        }
    }
    return null;
};

/**
 * Guarda (crea o actualiza) una sesión.
 * @param {object} session 
 */
const save = (session) => {
    if (!session || !session.id) {
        throw new Error('Se requiere un objeto de sesión con ID para guardar.');
    }
    sessions.set(session.id, session);
    saveSessionsToDisk(); // Persistir en cada guardado
};

/**
 * Elimina una sesión por su ID.
 * @param {string} id 
 */
const deleteById = (id) => {
    const deleted = sessions.delete(id);
    if (deleted) {
        saveSessionsToDisk(); // Persistir el cambio
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