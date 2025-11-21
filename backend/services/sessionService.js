const crypto = require('crypto');
const sessionRepository = require('../repositories/sessionRepository');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * [MODIFICADO] Ahora es asíncrono.
 * @param {object} userData 
 * @returns {object} El objeto de sesión creado.
 */
const createSecureSession = async (userData) => {
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

    // [MODIFICADO] Await al guardar en el repositorio
    await sessionRepository.save(session);
    return session;
};

// Lógica de login
const loginUser = async (email, password, userAgent) => {
    
    if (email === 'maria@example.com' && password === 'pass_maria') {
        console.log('[AUTH] Usando credenciales simuladas para Testing (Maria)');
        const mockData = {
            rut: '22.222.222-2',
            carreras: [
                { codigo: '8266', nombre: 'Ingeniería Civil Industrial', catalogo: '202410' }
            ]
        };
        
        // Crear sesión localmente sin ir al servidor externo
        const sessionData = await createSecureSession({
            rut: mockData.rut,
            email: email,
            carreras: mockData.carreras,
            userAgent: userAgent
        });

        return { sessionId: sessionData.id, sessionData, loginData: mockData };
    }
    
    // ... (lógica de fetch sin cambios) ...
    const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    try {
        const response = await fetch(loginUrl, { method: 'GET' });
        // ... (validaciones de response sin cambios) ...
        if (!response.ok) {
            let errorDetail = `Status ${response.status}`;
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.error) errorDetail = errorBody.error;
            } catch { /* ign */ }
            throw new Error('Credenciales inválidas', { cause: { detalle: errorDetail, status: 401 } });
        }
        // ... (validaciones de contentType y data sin cambios) ...
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

        // [MODIFICADO] Await a la creación de sesión
        const sessionData = await createSecureSession({
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

// [MODIFICADO] Cierra sesión ahora es asíncrono
const logoutUser = async (sessionId) => {
    if (sessionId) {
        await sessionRepository.deleteById(sessionId);
    }
};

/**
 * [MODIFICADO] Ahora es asíncrono.
 * @param {string} sessionId 
 * @returns {object | null}
 */
const getSession = async (sessionId) => {
    if (!sessionId) return null;
    
    const session = sessionRepository.findById(sessionId);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
        await sessionRepository.deleteById(sessionId);
        return null;
    }
    
    session.lastActivity = Date.now();
    await sessionRepository.save(session); // Actualiza la sesión (asíncrono)
    return session;
};

/**
 * [MODIFICADO] Ahora es asíncrono.
 * @param {string} token 
 * @returns {object | null}
 */
const findSessionByToken = async (token) => {
    const session = sessionRepository.findByToken(token);
    if (!session) return null;

    // Re-validar la sesión encontrada (ahora es async)
    return await getSession(session.id);
};

// Limpieza de sesiones
const cleanupExpiredSessions = async () => {
    const now = Date.now();
    let deletedCount = 0;
    
    const allSessions = sessionRepository.findAll();

    // Usar Promise.all para eliminar en paralelo (más eficiente)
    const deletionPromises = [];
    for (const session of allSessions) {
        if (now > session.expiresAt) {
            deletionPromises.push(sessionRepository.deleteById(session.id));
            deletedCount++;
        }
    }
    
    await Promise.all(deletionPromises);
    
    if (deletedCount > 0) {
        console.log(`[INFO] Servicio: Se eliminaron ${deletedCount} sesiones expiradas.`);
    }
};

// Programar limpieza
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
    loginUser,
    logoutUser,
    getSession,
    findSessionByToken
};