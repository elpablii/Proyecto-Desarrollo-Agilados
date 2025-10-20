const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));
app.use(cookieParser());

// Almacenamiento en memoria de sesiones (en producción usar Redis o base de datos)
const sessions = new Map();

// Middleware de logging de seguridad
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
    next();
});

// Middleware de autenticación
const authenticateSession = (req, res, next) => {
    const sessionId = req.cookies.ucn_session;
    
    if (!sessionId) {
        return res.status(401).json({ error: 'Sesión no encontrada' });
    }
    
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
    
    // Verificar expiración
    if (Date.now() > session.expiresAt) {
        sessions.delete(sessionId);
        return res.status(401).json({ error: 'Sesión expirada' });
    }
    
    // Actualizar tiempo de última actividad
    session.lastActivity = Date.now();
    req.session = session;
    next();
};

// Función para crear sesión segura
const createSecureSession = (userData) => {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
    
    const session = {
        id: sessionId,
        userId: userData.rut,
        email: userData.email,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: expiresAt,
        userAgent: userData.userAgent || 'unknown'
    };
    
    sessions.set(sessionId, session);
    return sessionId;
};

// Función para limpiar sesiones expiradas
const cleanupExpiredSessions = () => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(sessionId);
        }
    }
};

// Limpiar sesiones expiradas cada hora
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userAgent = req.get('User-Agent');
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Validación básica
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    // Log de intento de login
    console.log(`[LOGIN ATTEMPT] Email: ${email}, IP: ${clientIP}, User-Agent: ${userAgent}`);
    
    const url = `https://puclaro.ucn.cl/eross/avance/login.php?email=${email}&password=${password}`;
    
    try {
        const response = await fetch(url, { method: 'GET' });
        const data = await response.json();
        
        if (data.error) {
            // Log de login fallido
            console.log(`[LOGIN FAILED] Email: ${email}, IP: ${clientIP}, Error: ${data.error}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Login exitoso - crear sesión segura
        const sessionId = createSecureSession({
            rut: data.rut,
            email: email,
            userAgent: userAgent
        });
        
        // Configurar cookie segura
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            path: '/'
        };
        
        res.cookie('ucn_session', sessionId, cookieOptions);
        
        // Log de login exitoso
        console.log(`[LOGIN SUCCESS] Email: ${email}, RUT: ${data.rut}, IP: ${clientIP}, Session: ${sessionId}`);
        
        // Respuesta sin información sensible
        res.json({
            rut: data.rut,
            token: null, // No enviar token en la respuesta
            meta: {
                source: 'puclaro.ucn.cl',
                fetchedAt: new Date().toISOString(),
                sessionExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
        });
        
    } catch (err) {
        console.error(`[LOGIN ERROR] Email: ${email}, IP: ${clientIP}, Error:`, err);
        res.status(500).json({ error: 'Error al conectar con UCN', detalle: err.message });
    }
});

// Endpoint para logout
app.post('/logout', (req, res) => {
    const sessionId = req.cookies.ucn_session;
    
    if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
        console.log(`[LOGOUT] Session: ${sessionId} eliminada`);
    }
    
    res.clearCookie('ucn_session');
    res.json({ message: 'Sesión cerrada exitosamente' });
});

// Endpoint para verificar estado de sesión
app.get('/auth/status', authenticateSession, (req, res) => {
    res.json({
        authenticated: true,
        userId: req.session.userId,
        expiresAt: new Date(req.session.expiresAt).toISOString(),
        lastActivity: new Date(req.session.lastActivity).toISOString()
    });
});

// Endpoint para obtener datos de carrera del usuario (protegido)
app.get('/carreras/:rut', authenticateSession, async (req, res) => {
    const { rut } = req.params;
    
    // Intentar diferentes endpoints posibles
    const endpoints = [
        `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${rut}`,
        `https://puclaro.ucn.cl/eross/avance/estudiante.php?rut=${rut}`,
        `https://puclaro.ucn.cl/eross/avance/datos.php?rut=${rut}`,
        `https://puclaro.ucn.cl/eross/avance/info.php?rut=${rut}`
    ];
    
    for (const url of endpoints) {
        try {
            console.log(`Intentando endpoint: ${url}`);
            const response = await fetch(url, { method: 'GET' });
            
            // Verificar si la respuesta es HTML (error 404 o similar)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.log(`Endpoint ${url} devolvió HTML, intentando siguiente...`);
                continue;
            }
            
            const data = await response.json();
            console.log(`Éxito con endpoint: ${url}`);
            return res.json(data);
        } catch (err) {
            console.log(`Error con endpoint ${url}:`, err.message);
            continue;
        }
    }
    
    // Si ningún endpoint funciona, devolver datos de ejemplo
    console.log('Ningún endpoint funcionó, devolviendo datos de ejemplo');
    const datosEjemplo = {
        rut: rut,
        carreras: [
            {
                codigo: "8266",
                nombre: "ITI",
                catalogo: "202410"
            },
            {
                codigo: "8606", 
                nombre: "ICCI",
                catalogo: "201610"
            }
        ]
    };
    res.json(datosEjemplo);
});

// Endpoint alternativo para obtener datos de carrera con autenticación
app.post('/carreras', async (req, res) => {
    const { rut, email, password } = req.body;
    // Primero autenticamos al usuario
    const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${email}&password=${password}`;
    try {
        const loginResponse = await fetch(loginUrl, { method: 'GET' });
        const loginData = await loginResponse.json();
        
        if (loginData.error) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Si la autenticación es exitosa, obtenemos los datos de carrera
        const carrerasUrl = `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${rut}`;
        const carrerasResponse = await fetch(carrerasUrl, { method: 'GET' });
        const carrerasData = await carrerasResponse.json();
        
        res.json(carrerasData);
    } catch (err) {
        console.error('Error al obtener datos de carrera:', err);
        res.status(500).json({ error: 'Error al obtener datos de carrera', detalle: err.message });
    }
});

// Endpoint para obtener datos de carrera usando las credenciales del usuario logueado
app.get('/carreras-autenticado/:rut', async (req, res) => {
    const { rut } = req.params;
    
    // Obtener credenciales del usuario desde las cookies o headers
    const { email, password } = req.query;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Se requieren email y password' });
    }
    
    try {
        // Primero autenticamos al usuario
        const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${email}&password=${password}`;
        const loginResponse = await fetch(loginUrl, { method: 'GET' });
        const loginData = await loginResponse.json();
        
        if (loginData.error) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Intentar diferentes endpoints para obtener datos de carrera
        const endpoints = [
            `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${rut}`,
            `https://puclaro.ucn.cl/eross/avance/estudiante.php?rut=${rut}`,
            `https://puclaro.ucn.cl/eross/avance/datos.php?rut=${rut}`,
            `https://puclaro.ucn.cl/eross/avance/info.php?rut=${rut}`
        ];
        
        for (const url of endpoints) {
            try {
                console.log(`Intentando endpoint autenticado: ${url}`);
                const response = await fetch(url, { method: 'GET' });
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    console.log(`Endpoint ${url} devolvió HTML, intentando siguiente...`);
                    continue;
                }
                
                const data = await response.json();
                console.log(`Éxito con endpoint autenticado: ${url}`);
                return res.json(data);
            } catch (err) {
                console.log(`Error con endpoint autenticado ${url}:`, err.message);
                continue;
            }
        }
        
        // Si ningún endpoint funciona, devolver datos de ejemplo
        console.log('Ningún endpoint autenticado funcionó, devolviendo datos de ejemplo');
        const datosEjemplo = {
            rut: rut,
            carreras: [
                {
                    codigo: "8266",
                    nombre: "ITI",
                    catalogo: "202410"
                },
                {
                    codigo: "8606", 
                    nombre: "ICCI",
                    catalogo: "201610"
                }
            ]
        };
        res.json(datosEjemplo);
        
    } catch (err) {
        console.error('Error al obtener datos de carrera autenticado:', err);
        res.status(500).json({ error: 'Error al obtener datos de carrera', detalle: err.message });
    }
});

app.listen(3001, () => console.log('Backend intermedio corriendo en http://localhost:3001'));
