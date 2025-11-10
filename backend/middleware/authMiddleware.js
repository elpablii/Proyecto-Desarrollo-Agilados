// Este middleware ahora habla con el sessionService, no con el repositorio.
const sessionService = require('../services/sessionService');

const authenticateSession = (req, res, next) => {
    let sessionId = req.cookies.ucn_session;
    let session = null;
    
    console.log(`[AUTH DEBUG] Cookies recibidas:`, req.cookies);

    if (sessionId) {
        // Validar sesión de cookie
        session = sessionService.getSession(sessionId);
        console.log(`[AUTH DEBUG] Buscando sesiónId=${sessionId} ->`, !!session);
    } else {
        // Fallback: Check Authorization header
        const authHeader = req.get('Authorization') || req.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            // Validar sesión de token
            session = sessionService.findSessionByToken(token);
            console.log('[AUTH DEBUG] Buscando sesión por token ->', !!session);
        }
    }

    if (!session) {
        if (sessionId) res.clearCookie('ucn_session');
        const errorMsg = sessionId ? 'Sesión inválida o expirada' : 'Sesión no encontrada o inválida';
        console.log(`[AUTH DEBUG] Falla: ${errorMsg}`);
        return res.status(401).json({ error: errorMsg });
    }

    // Adjuntar sesión al request
    req.session = session;
    next();
};

module.exports = {
    authenticateSession
};