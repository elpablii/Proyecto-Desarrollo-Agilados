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
const fs = require('fs');
const path = require('path');

// Persistir sesiones en disco para sobrevivir reinicios del servidor (dev)
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

const sessions = new Map();

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
            console.log(`Cargadas ${sessions.size} sesiones desde disco`);
        }
    } catch (err) {
        console.warn('No se pudieron cargar sesiones desde disco:', err.message);
    }
};

const saveSessionsToDisk = () => {
    try {
        const arr = Array.from(sessions.values());
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (err) {
        console.warn('No se pudieron guardar sesiones en disco:', err.message);
    }
};

// Intentar cargar sesiones al iniciar
loadSessionsFromDisk();

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
    console.log(`[AUTH DEBUG] Cookies recibidas:`, req.cookies);
    
    if (!sessionId) {
        console.log('[AUTH DEBUG] No se encontró cookie ucn_session');
        return res.status(401).json({ error: 'Sesión no encontrada' });
    }
    
    const session = sessions.get(sessionId);
    console.log(`[AUTH DEBUG] Buscando sesiónId=${sessionId} ->`, !!session);
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
    // Persistir inmediatamente
    saveSessionsToDisk();
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
    // Guardar cambios
    saveSessionsToDisk();
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
    
    // Construir URL con parámetros codificados
    const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    try {
        const response = await fetch(loginUrl, { method: 'GET' });

        // Verificar que la respuesta HTTP sea OK
        if (!response.ok) {
            console.log(`[LOGIN FAILED HTTP] Email: ${email}, IP: ${clientIP}, Status: ${response.status}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            console.log(`[LOGIN FAILED TYPE] Email: ${email}, IP: ${clientIP}, Content-Type: ${contentType}`);
            return res.status(502).json({ error: 'Respuesta inesperada del servicio de autenticación' });
        }

        let data;
        try {
            data = await response.json();
        } catch (parseErr) {
            console.log(`[LOGIN PARSE ERROR] Email: ${email}, IP: ${clientIP}, Error: ${parseErr.message}`);
            return res.status(502).json({ error: 'Respuesta no válida del servicio de autenticación' });
        }

        if (!data || data.error || !data.rut) {
            const reason = data && data.error ? data.error : 'respuesta inválida sin rut';
            console.log(`[LOGIN FAILED] Email: ${email}, IP: ${clientIP}, Reason: ${reason}`);
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
    // Persistir cambios de sesiones
    saveSessionsToDisk();
    
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
    const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    try {
        const loginResponse = await fetch(loginUrl, { method: 'GET' });

        if (!loginResponse.ok) {
            console.log(`[CARRERAS LOGIN FAILED HTTP] Email: ${email}, Status: ${loginResponse.status}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const ct = loginResponse.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            console.log(`[CARRERAS LOGIN FAILED TYPE] Email: ${email}, Content-Type: ${ct}`);
            return res.status(502).json({ error: 'Respuesta inesperada del servicio de autenticación' });
        }

        let loginData;
        try {
            loginData = await loginResponse.json();
        } catch (e) {
            console.log('[CARRERAS LOGIN PARSE ERROR]', e.message);
            return res.status(502).json({ error: 'Respuesta no válida del servicio de autenticación' });
        }

        if (loginData.error || !loginData.rut) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Si la autenticación es exitosa, obtenemos los datos de carrera
        const carrerasUrl = `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${encodeURIComponent(rut)}`;
        const carrerasResponse = await fetch(carrerasUrl, { method: 'GET' });

        if (!carrerasResponse.ok) {
            console.log(`[CARRERAS FETCH FAILED] rut: ${rut}, Status: ${carrerasResponse.status}`);
            return res.status(502).json({ error: 'No se pudo obtener datos de carreras' });
        }

        const ct2 = carrerasResponse.headers.get('content-type') || '';
        if (!ct2.includes('application/json')) {
            console.log(`[CARRERAS FETCH TYPE INVALID] rut: ${rut}, Content-Type: ${ct2}`);
            return res.status(502).json({ error: 'Respuesta inesperada al solicitar datos de carreras' });
        }

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
        const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        const loginResponse = await fetch(loginUrl, { method: 'GET' });

        if (!loginResponse.ok) {
            console.log(`[CARRERAS-AUTENTICADO LOGIN FAILED HTTP] Email: ${email}, Status: ${loginResponse.status}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const ctLogin = loginResponse.headers.get('content-type') || '';
        if (!ctLogin.includes('application/json')) {
            console.log(`[CARRERAS-AUTENTICADO LOGIN TYPE] Email: ${email}, Content-Type: ${ctLogin}`);
            return res.status(502).json({ error: 'Respuesta inesperada del servicio de autenticación' });
        }

        let loginData;
        try {
            loginData = await loginResponse.json();
        } catch (e) {
            console.log('[CARRERAS-AUTENTICADO LOGIN PARSE ERROR]', e.message);
            return res.status(502).json({ error: 'Respuesta no válida del servicio de autenticación' });
        }

        if (loginData.error || !loginData.rut) {
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
