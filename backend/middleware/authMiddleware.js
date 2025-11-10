// Este middleware ahora es asíncrono
const sessionService = require('../services/sessionService');

const authenticateSession = async (req, res, next) => { // [MODIFICADO] async
    let sessionId = req.cookies.ucn_session;
    let session = null;
    
    console.log(`[AUTH DEBUG] Cookies recibidas:`, req.cookies);

    if (sessionId) {
        // [MODIFICADO] await
        session = await sessionService.getSession(sessionId);
        console.log(`[AUTH DEBUG] Buscando sesiónId=${sessionId} ->`, !!session);
    } else {
        const authHeader = req.get('Authorization') || req.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            // [MODIFICADO] await
            session = await sessionService.findSessionByToken(token);
            console.log('[AUTH DEBUG] Buscando sesión por token ->', !!session);
        }
    }

    if (!session) {
        if (sessionId) res.clearCookie('ucn_session');
        const errorMsg = sessionId ? 'Sesión inválida o expirada' : 'Sesión no encontrada o inválida';
        console.log(`[AUTH DEBUG] Falla: ${errorMsg}`);
        return res.status(401).json({ error: errorMsg });
    }

    req.session = session;
    next();
};

module.exports = {
    authenticateSession
};