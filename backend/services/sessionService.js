// Servicio para manejar la lógica de sesiones (ahora usa el repositorio)
const crypto = require('crypto');
const sessionRepository = require('../repositories/sessionRepository');

// Use dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// (loadSessionsFromDisk se llama ahora desde index.js)

/**
 * Crea el objeto de sesión (Lógica de negocio).
 * @param {object} userData 
 * @returns {object} El objeto de sesión creado.
 */
const createSecureSession = (userData) => {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 horas

    const session = {
        id: sessionId,
        token: token,
        userId: userData.rut,
        email: userData.email,
        carreras: userData.carreras,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: expiresAt,
        userAgent: userData.userAgent || 'unknown'
    };

    // Pide al repositorio que guarde la sesión
    sessionRepository.save(session);
    return session;
};

// Lógica de login
const loginUser = async (email, password, userAgent) => {
    // (La lógica de fetch y validación sigue siendo lógica de servicio)
    const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    try {
        const response = await fetch(loginUrl, { method: 'GET' });

        if (!response.ok) {
            let errorDetail = `Status ${response.status}`;
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.error) errorDetail = errorBody.error;
            } catch { /* ign */ }
            throw new Error('Credenciales inválidas', { cause: { detalle: errorDetail, status: 401 } });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('Respuesta inesperada del servicio de autenticación (no JSON)', { cause: { status: 502 } });
        }

        let data;
        try {
            data = await response.json();
        } catch (parseErr) {
            throw new Error('Respuesta no válida del servicio de autenticación (error parse)', { cause: { status: 502 } });
        }

        if (!data || data.error || !data.rut || !data.carreras) {
            const reason = data && data.error ? data.error : 'Respuesta inválida o falta RUT/carreras';
            throw new Error('Credenciales inválidas', { cause: { detalle: reason, status: 401 } });
        }

        // Éxito, crear sesión (lógica de negocio + persistencia vía repo)
        const sessionData = createSecureSession({
            rut: data.rut,
            email: email,
            carreras: data.carreras,
            userAgent: userAgent
        });

        return { sessionId: sessionData.id, sessionData, loginData: data };

    } catch (err) {
        if (err.cause) {
            err.detalle = err.cause.detalle;
            err.status = err.cause.status;
        }
        throw err;
    }
};

// Cierra sesión
const logoutUser = (sessionId) => {
    if (sessionId) {
        sessionRepository.deleteById(sessionId);
    }
};

/**
 * Obtiene y valida una sesión desde el repositorio.
 * @param {string} sessionId 
 * @returns {object | null}
 */
const getSession = (sessionId) => {
    if (!sessionId) return null;
    
    // Pide la sesión al repositorio
    const session = sessionRepository.findById(sessionId);
    if (!session) return null;

    // Verificar expiración (lógica de negocio)
    if (Date.now() > session.expiresAt) {
        sessionRepository.deleteById(sessionId);
        return null;
    }
    
    // Actualizar actividad y guardar (lógica de negocio)
    session.lastActivity = Date.now();
    sessionRepository.save(session); // Actualiza la sesión en el repo
    return session;
};

/**
 * Busca una sesión por token (para el middleware de autenticación).
 * @param {string} token 
 * @returns {object | null}
 */
const findSessionByToken = (token) => {
    const session = sessionRepository.findByToken(token);
    if (!session) return null;

    // Re-validar la sesión encontrada (expiración, etc.)
    return getSession(session.id);
};

// Limpieza de sesiones
const cleanupExpiredSessions = () => {
    const now = Date.now();
    let deletedCount = 0;
    
    // Pide todos los datos al repositorio
    const allSessions = sessionRepository.findAll();

    // Aplica lógica de negocio (cuál expira)
    for (const session of allSessions) {
        if (now > session.expiresAt) {
            sessionRepository.deleteById(session.id); // Pide al repositorio que elimine
            deletedCount++;
        }
    }
    
    if (deletedCount > 0) {
        console.log(`[INFO] Servicio: Se eliminaron ${deletedCount} sesiones expiradas.`);
        // saveSessionsToDisk() es llamado por deleteById
    }
};

// Programar limpieza
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
    // loadSessionsFromDisk, // Ya no lo exporta el servicio
    loginUser,
    logoutUser,
    getSession,
    findSessionByToken
};