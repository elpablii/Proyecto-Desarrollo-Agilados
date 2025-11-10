const authService = require('../services/sessionService');

// Maneja el inicio de sesión
const handleLogin = async (req, res) => {
    // La validación de existencia (if !email) se elimina
    // Los datos ya fueron validados y sanitizados por 'loginRules'
    const { email, password } = req.body;
    const userAgent = req.get('User-Agent');
    const clientIP = req.ip || req.connection.remoteAddress;

    console.log(`[LOGIN ATTEMPT] Email: ${email}, IP: ${clientIP}`);

    try {
        const { sessionId, sessionData, loginData } = await authService.loginUser(email, password, userAgent);

        // Configuración de la cookie
        const isProd = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        };

        res.cookie('ucn_session', sessionId, cookieOptions);

        console.log(`[LOGIN SUCCESS] Email: ${email}, RUT: ${loginData.rut}, IP: ${clientIP}, Session: ${sessionId}`);

        // Respuesta al cliente
        res.json({
            rut: loginData.rut,
            token: sessionData.token, // Token de fallback
            meta: {
                source: 'puclaro.ucn.cl',
                fetchedAt: new Date().toISOString(),
                sessionExpires: new Date(sessionData.expiresAt).toISOString()
            }
        });

    } catch (error) {
        console.error(`[LOGIN ERROR] Email: ${email}, IP: ${clientIP}, Error:`, error);
        if (error.message.includes('Credenciales')) {
            return res.status(401).json({ error: error.message, detalle: error.detalle });
        }
        if (error.message.includes('Respuesta inesperada')) {
            return res.status(502).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor al procesar el login', detalle: error.message });
    }
};

// Maneja el cierre de sesión
const handleLogout = (req, res) => {
    const sessionId = req.cookies.ucn_session;

    if (sessionId) {
        authService.logoutUser(sessionId);
        console.log(`[LOGOUT] Session: ${sessionId} eliminada`);
    }

    res.clearCookie('ucn_session', { path: '/' });
    res.json({ message: 'Sesión cerrada exitosamente' });
};

// Devuelve el estado de la sesión actual
const getAuthStatus = (req, res) => {
    // req.session es adjuntado por el middleware authenticateSession
    res.json({
        authenticated: true,
        userId: req.session.userId,
        expiresAt: new Date(req.session.expiresAt).toISOString(),
        lastActivity: new Date(req.session.lastActivity).toISOString()
    });
};

module.exports = {
    handleLogin,
    handleLogout,
    getAuthStatus
};