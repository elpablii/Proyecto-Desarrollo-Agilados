// Import necessary modules
const express = require('express');
// Use dynamic import for node-fetch as it's an ES module
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();
// Middleware setup
app.use(express.json()); // Parse JSON bodies
app.use(cors({
    origin: [ // Allow requests from these frontend origins
        'http://localhost:5500',
        'http://127.0.0.1:5500'
        // Add other frontend origins if needed (e.g., deployed frontend URL)
    ],
    credentials: true // Allow sending cookies
}));
app.use(cookieParser()); // Parse cookies

// --- Session Management ---

// Path to the session persistence file
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

// Path to projections persistence file (development store)
const PROYECCIONES_FILE = path.join(__dirname, 'proyecciones.json');

// In-memory projections store (array of {id, userId, codigoCarrera, name, projection, createdAt, updatedAt})
let proyecciones = [];

// In-memory session store (Map)
const sessions = new Map();

// Load sessions from disk on startup
const loadSessionsFromDisk = () => {
    try {
        if (fs.existsSync(SESSIONS_FILE)) {
            const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            const now = Date.now();
            for (const s of parsed) {
                // Restore only non-expired sessions
                if (s.expiresAt && s.expiresAt > now) {
                    sessions.set(s.id, s);
                }
            }
            console.log(`[INFO] Cargadas ${sessions.size} sesiones desde disco`);
        }
    } catch (err) {
        console.warn('[WARN] No se pudieron cargar sesiones desde disco:', err.message);
    }
};

// Save sessions to disk
const saveSessionsToDisk = () => {
    try {
        const arr = Array.from(sessions.values());
        // Write sessions array to JSON file
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (err) {
        console.warn('[WARN] No se pudieron guardar sesiones en disco:', err.message);
    }
};

// Load projections from disk
const loadProyeccionesFromDisk = () => {
    try {
        if (fs.existsSync(PROYECCIONES_FILE)) {
            const raw = fs.readFileSync(PROYECCIONES_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) proyecciones = parsed;
            console.log(`[INFO] Cargadas ${proyecciones.length} proyecciones desde disco`);
        }
    } catch (err) {
        console.warn('[WARN] No se pudieron cargar proyecciones desde disco:', err.message);
    }
};

// Save projections to disk
const saveProyeccionesToDisk = () => {
    try {
        fs.writeFileSync(PROYECCIONES_FILE, JSON.stringify(proyecciones, null, 2), 'utf8');
    } catch (err) {
        console.warn('[WARN] No se pudieron guardar proyecciones en disco:', err.message);
    }
};

// Helper: try to load a local fallback malla (specific then generic)
const getLocalMallaFallback = (mallaId) => {
    try {
        const fallbackPath = path.join(__dirname, 'data', 'mallas', `${mallaId}.json`);
        if (fs.existsSync(fallbackPath)) {
            const raw = fs.readFileSync(fallbackPath, 'utf8');
            return { malla: JSON.parse(raw), source: 'local-fallback', path: fallbackPath };
        }
    } catch (e) {
        console.warn('[MALLA FALLBACK] Error leyendo fallback específico:', e.message);
    }
    try {
        const genericFallback = path.join(__dirname, '..', 'frontend', 'malla', 'malla-fallback.json');
        if (fs.existsSync(genericFallback)) {
            const raw2 = fs.readFileSync(genericFallback, 'utf8');
            return { malla: JSON.parse(raw2), source: 'frontend-generic-fallback', path: genericFallback };
        }
    } catch (e) {
        console.warn('[MALLA FALLBACK] Error leyendo fallback genérico:', e.message);
    }
    return null;
};

// Helper: Normalize RUT by removing dots and dashes (used across multiple routes)
const normalizeRut = (r) => r ? r.replace(/[.\-]/g, '') : '';

// Initial load of sessions
loadSessionsFromDisk();
// Initial load of projections
loadProyeccionesFromDisk();

// --- Middleware ---

// Basic security/logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    // Get client IP address
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`[REQ] [${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
    next(); // Continue to next middleware/route
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[INFO] Backend intermedio corriendo en http://localhost:${PORT}`);
});

// Authentication middleware
const authenticateSession = (req, res, next) => {
    // Attempt to get session ID from cookie
    let sessionId = req.cookies.ucn_session;
    console.log(`[AUTH DEBUG] Cookies recibidas:`, req.cookies);

    // Fallback: Check Authorization header if no cookie
    if (!sessionId) {
        const authHeader = req.get('Authorization') || req.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            // Find session ID associated with the token
            for (const [id, s] of sessions.entries()) {
                if (s.token === token) {
                    sessionId = id;
                    break;
                }
            }
            console.log('[AUTH DEBUG] Buscando sesión por token ->', !!sessionId);
        }
    }

    // If no session ID found from either source
    if (!sessionId) {
        console.log('[AUTH DEBUG] No se encontró cookie ucn_session ni token Authorization');
        return res.status(401).json({ error: 'Sesión no encontrada o inválida' });
    }

    // Retrieve session from store
    const session = sessions.get(sessionId);
    console.log(`[AUTH DEBUG] Buscando sesiónId=${sessionId} ->`, !!session);

    // If session doesn't exist or is invalid
    if (!session) {
        res.clearCookie('ucn_session'); // Clear invalid cookie if present
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    // Check session expiration
    if (Date.now() > session.expiresAt) {
        sessions.delete(sessionId); // Remove expired session
        saveSessionsToDisk(); // Persist change
        res.clearCookie('ucn_session'); // Clear expired cookie
        return res.status(401).json({ error: 'Sesión expirada' });
    }

    // Update last activity time for session sliding expiration/tracking
    session.lastActivity = Date.now();
    // Attach session data to request object for use in subsequent handlers
    req.session = session;
    next(); // Proceed to the protected route
};

// --- Session Helper Functions ---

// Function to create a new secure session
const createSecureSession = (userData) => {
    // Generate secure random IDs
    const sessionId = crypto.randomBytes(32).toString('hex');
    const token = crypto.randomBytes(32).toString('hex'); // Token for potential header auth
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // Session expires in 24 hours

    // Create session object
    const session = {
        id: sessionId,
        token: token, // Store token in session data
        userId: userData.rut, // Store user identifier (RUT)
        email: userData.email, // Store user email
        carreras: userData.carreras, // *** CAMBIO: Guardar carreras en sesión ***
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: expiresAt,
        userAgent: userData.userAgent || 'unknown' // Store User-Agent for potential security checks
    };

    // Store session in memory
    sessions.set(sessionId, session);
    // Persist session to disk
    saveSessionsToDisk();
    return sessionId; // Return the session ID
};

// Function to remove expired sessions from the store
const cleanupExpiredSessions = () => {
    const now = Date.now();
    let deletedCount = 0;
    for (const [sessionId, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(sessionId);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        console.log(`[INFO] Se eliminaron ${deletedCount} sesiones expiradas.`);
        saveSessionsToDisk(); // Save changes if sessions were deleted
    }
};

// Schedule session cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// --- Routes ---

// Login Endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userAgent = req.get('User-Agent');
    const clientIP = req.ip || req.connection.remoteAddress;

    // Basic input validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    console.log(`[LOGIN ATTEMPT] Email: ${email}, IP: ${clientIP}`);

    // Target login URL
    const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    try {
        // Fetch data from the external login service
        const response = await fetch(loginUrl, { method: 'GET' });

        // Check for non-OK HTTP status
        if (!response.ok) {
            console.log(`[LOGIN FAILED HTTP] Email: ${email}, IP: ${clientIP}, Status: ${response.status}`);
            // Attempt to get error details from response if available
            let errorDetail = `Status ${response.status}`;
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.error) {
                    errorDetail = errorBody.error;
                }
            } catch { /* Ignore parsing error */ }
            return res.status(401).json({ error: 'Credenciales inválidas', detalle: errorDetail });
        }

        // Check if response content type is JSON
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            console.log(`[LOGIN FAILED TYPE] Email: ${email}, IP: ${clientIP}, Content-Type: ${contentType}`);
            return res.status(502).json({ error: 'Respuesta inesperada del servicio de autenticación (no JSON)' });
        }

        // Parse JSON response
        let data;
        try {
            data = await response.json();
        } catch (parseErr) {
            console.log(`[LOGIN PARSE ERROR] Email: ${email}, IP: ${clientIP}, Error: ${parseErr.message}`);
            return res.status(502).json({ error: 'Respuesta no válida del servicio de autenticación (error parse)' });
        }

        // *** CAMBIO: Validar que 'carreras' exista en la respuesta ***
        if (!data || data.error || !data.rut || !data.carreras) { 
            const reason = data && data.error ? data.error : 'Respuesta inválida o falta RUT/carreras';
            console.log(`[LOGIN FAILED] Email: ${email}, IP: ${clientIP}, Reason: ${reason}`);
            return res.status(401).json({ error: 'Credenciales inválidas', detalle: reason });
        }

        // Login successful - Create session
        const sessionId = createSecureSession({
            rut: data.rut,
            email: email,
            carreras: data.carreras, // *** CAMBIO: Pasar carreras a la sesión ***
            userAgent: userAgent
        });

        // Set secure session cookie
        const isProd = process.env.NODE_ENV === 'production';
        // Use Lax by default to improve compatibility in local HTTP development.
        // In production (HTTPS) cookies will be secure.
        const cookieOptions = {
            httpOnly: true,
            secure: isProd, // true only in production where HTTPS is expected
            sameSite: 'Lax', // Lax is a good balance for dev and production
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        };

        res.cookie('ucn_session', sessionId, cookieOptions);

        console.log(`[LOGIN SUCCESS] Email: ${email}, RUT: ${data.rut}, IP: ${clientIP}, Session: ${sessionId}`);

        // Send response to client
        const sessionData = sessions.get(sessionId);
        res.json({
            rut: data.rut,
            token: sessionData ? sessionData.token : null, // Include token for header auth fallback
            meta: {
                source: 'puclaro.ucn.cl',
                fetchedAt: new Date().toISOString(),
                sessionExpires: new Date(sessionData.expiresAt).toISOString()
            }
        });

    } catch (err) {
        console.error(`[LOGIN ERROR] Email: ${email}, IP: ${clientIP}, Error:`, err);
        res.status(500).json({ error: 'Error interno del servidor al procesar el login', detalle: err.message });
    }
});

// Logout Endpoint
app.post('/logout', (req, res) => {
    const sessionId = req.cookies.ucn_session;

    // If session exists, delete it
    if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
        saveSessionsToDisk(); // Persist changes
        console.log(`[LOGOUT] Session: ${sessionId} eliminada`);
    }

    // Clear the session cookie on the client
    res.clearCookie('ucn_session', { path: '/' });
    res.json({ message: 'Sesión cerrada exitosamente' });
});

// Authentication Status Endpoint (Protected)
app.get('/auth/status', authenticateSession, (req, res) => {
    // If authenticateSession middleware passes, user is authenticated
    res.json({
        authenticated: true,
        userId: req.session.userId, // Send back the user ID (RUT)
        expiresAt: new Date(req.session.expiresAt).toISOString(),
        lastActivity: new Date(req.session.lastActivity).toISOString()
    });
});

// --- NEW ENDPOINTS for Malla and Avance ---

// Malla Endpoint (Not Authenticated as per example)
// Parameter format: {codigoCarrera}-{catalogo} e.g., 8606-201610
app.get('/malla/:mallaId', async (req, res) => {
    const { mallaId } = req.params;
    // Basic validation for the mallaId format
    if (!mallaId || !/^\d+-\d+$/.test(mallaId)) {
        return res.status(400).json({ error: 'Formato de ID de malla inválido. Use {codigo}-{catalogo}.' });
    }

    // Target URL for the external malla service
    const targetUrl = `https://losvilos.ucn.cl/hawaii/api/mallas?${mallaId}`;
    // Required authentication header for the target service
    // Use environment variable HAWAII_AUTH in production; fallback to embedded dev token
    const hawaiiAuthToken = process.env.HAWAII_AUTH || 'jf400fejof13f';

    console.log(`[MALLA] Requesting malla for ${mallaId} from ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'X-HAWAII-AUTH': hawaiiAuthToken,
                // Add any other necessary headers if required by the target API
            }
        });

        // Check if the external service responded successfully
        if (!response.ok) {
            console.error(`[MALLA ERROR HTTP] Failed for ${mallaId}. Status: ${response.status}`);
            let errorDetail = `Status ${response.status}`;
            try { // Try to get more details if the response is JSON
                const errorBody = await response.json();
                if (errorBody && (errorBody.error || errorBody.message)) {
                    errorDetail = errorBody.error || errorBody.message;
                }
            } catch { /* Ignore parsing error */ }

            // If the external service denies access (401/403) try to return a local fallback file
            if (response.status === 401 || response.status === 403) {
                try {
                    const fallbackPath = path.join(__dirname, 'data', 'mallas', `${mallaId}.json`);
                    if (fs.existsSync(fallbackPath)) {
                        const raw = fs.readFileSync(fallbackPath, 'utf8');
                        const fallbackData = JSON.parse(raw);
                        console.log(`[MALLA FALLBACK] Returning local fallback for ${mallaId} from ${fallbackPath}`);
                        return res.json({ malla: fallbackData, meta: { source: 'local-fallback', fetchedAt: new Date().toISOString() } });
                    } else {
                        console.warn(`[MALLA FALLBACK] No fallback file found at ${fallbackPath}`);
                    }
                    // If no specific fallback exists, try a generic frontend fallback if available
                    try {
                        const genericFallback = path.join(__dirname, '..', 'frontend', 'malla', 'malla-fallback.json');
                        if (fs.existsSync(genericFallback)) {
                            const raw2 = fs.readFileSync(genericFallback, 'utf8');
                            const fallbackData2 = JSON.parse(raw2);
                            console.log(`[MALLA FALLBACK] Returning generic frontend fallback for ${mallaId} from ${genericFallback}`);
                            return res.json({ malla: fallbackData2, meta: { source: 'generic-frontend-fallback', fetchedAt: new Date().toISOString() } });
                        }
                    } catch (fb2Err) {
                        console.warn('[MALLA FALLBACK] Error reading generic frontend fallback:', fb2Err.message);
                    }
                } catch (fbErr) {
                    console.warn('[MALLA FALLBACK] Error reading fallback file:', fbErr.message);
                }
            }

            return res.status(response.status).json({ error: `Error al obtener datos de la malla (${response.status})`, detalle: errorDetail });
        }

        // Check content type
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            console.error(`[MALLA ERROR TYPE] Invalid content type for ${mallaId}: ${contentType}`);
            return res.status(502).json({ error: 'Respuesta inesperada del servicio de mallas (no JSON)' });
        }

        // Parse and return the JSON data
        const data = await response.json();
        console.log(`[MALLA SUCCESS] Malla data retrieved for ${mallaId}`);
        // Optionally add metadata before sending back
        res.json({
            malla: data, // Wrap the original array in an object if desired, or send directly
            meta: {
                source: 'losvilos.ucn.cl',
                fetchedAt: new Date().toISOString()
            }
         });

    } catch (err) {
        console.error(`[MALLA ERROR] Exception for ${mallaId}:`, err);
        res.status(500).json({ error: 'Error interno del servidor al obtener la malla', detalle: err.message });
    }
});

// Avance Endpoint (Protected by Authentication)
app.get('/avance/:rut/:codigoCarrera', authenticateSession, async (req, res) => {
    const { rut, codigoCarrera } = req.params;
    const sessionUserId = req.session.userId; // Get RUT from the authenticated session

    // Security check: Ensure the requested RUT matches the session's user ID
    // Remove dots and dashes for comparison if RUT formats might differ
    if (normalizeRut(rut) !== normalizeRut(sessionUserId)) {
         console.warn(`[AVANCE FORBIDDEN] Session user ${sessionUserId} attempted to access avance for ${rut}`);
         return res.status(403).json({ error: 'No autorizado para acceder a este avance curricular.' });
    }

    // Target URL for the external avance service
    const targetUrl = `https://puclaro.ucn.cl/eross/avance/avance.php?rut=${encodeURIComponent(rut)}&codcarrera=${encodeURIComponent(codigoCarrera)}`;

    console.log(`[AVANCE] Requesting avance for ${rut}/${codigoCarrera} from ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
        });

        if (!response.ok) {
            console.error(`[AVANCE ERROR HTTP] Failed for ${rut}/${codigoCarrera}. Status: ${response.status}`);
             let errorDetail = `Status ${response.status}`;
             try {
                 const errorBody = await response.json();
                 // The example shows error: "Avance no encontrado"
                 if (errorBody && errorBody.error) {
                     errorDetail = errorBody.error;
                     // Return 404 if the specific error is "Avance no encontrado"
                     if (errorDetail.includes("no encontrado")) {
                         return res.status(404).json({ error: errorDetail });
                     }
                 }
             } catch { /* Ignore parsing error */ }
             return res.status(response.status).json({ error: `Error al obtener datos del avance (${response.status})`, detalle: errorDetail });
        }

        const contentType = response.headers.get('content-type') || '';
         if (!contentType.includes('application/json')) {
            console.error(`[AVANCE ERROR TYPE] Invalid content type for ${rut}/${codigoCarrera}: ${contentType}`);
            return res.status(502).json({ error: 'Respuesta inesperada del servicio de avance (no JSON)' });
        }

        const data = await response.json();

         // Check for specific error messages within a successful HTTP response
         if (data && data.error) {
             console.warn(`[AVANCE WARN] Service returned error for ${rut}/${codigoCarrera}: ${data.error}`);
             // Return 404 if the specific error is "Avance no encontrado"
             if (data.error.includes("no encontrado")) {
                 return res.status(404).json({ error: data.error });
             }
             // Otherwise return a generic error or the specific one
             return res.status(400).json({ error: data.error });
         }

        console.log(`[AVANCE SUCCESS] Avance data retrieved for ${rut}/${codigoCarrera}`);
         // Optionally add metadata
         res.json({
             avance: data, // Wrap array if desired
             meta: {
                 source: 'puclaro.ucn.cl',
                 fetchedAt: new Date().toISOString()
             }
         });

    } catch (err) {
        console.error(`[AVANCE ERROR] Exception for ${rut}/${codigoCarrera}:`, err);
        res.status(500).json({ error: 'Error interno del servidor al obtener el avance', detalle: err.message });
    }
});

// --- Deprecated/Alternative Routes (Keep or remove as needed) ---

// *** CAMBIO: Este endpoint ahora lee desde la sesión ***
app.get('/carreras/:rut', authenticateSession, async (req, res) => {
    const { rut } = req.params;
    const sessionUserId = req.session.userId; 
    const sessionCarreras = req.session.carreras; // *** CAMBIO: Obtener carreras de la sesión ***

    // Security check: Ensure the requested RUT matches the session's user ID
    if (normalizeRut(rut) !== normalizeRut(sessionUserId)) {
         console.warn(`[CARRERAS FORBIDDEN] Session user ${sessionUserId} attempted to access carreras for ${rut}`);
         return res.status(403).json({ error: 'No autorizado para acceder a estas carreras.' });
    }

    console.log(`[CARRERAS] Requesting carreras for ${rut} from session`);

    // *** CAMBIO: Devolver datos desde la sesión ***
    if (sessionCarreras) {
        res.json({
            rut: sessionUserId,
            carreras: sessionCarreras,
             meta: { source: 'session-cache', fetchedAt: new Date().toISOString() }
        });
    } else {
        // This case should ideally not happen if login stores it
        console.error(`[CARRERAS ERROR] No 'carreras' found in session for user ${sessionUserId}`);
        res.status(404).json({ error: 'Datos de carrera no encontrados en la sesión.' });
    }
});


// Endpoint alternativo POST /carreras (redundant if using sessions)
// Consider removing if GET /carreras/:rut with session auth is sufficient
app.post('/carreras', async (req, res) => {
    // ... (implementation as before, but likely unnecessary with session management) ...
    console.warn("[WARN] POST /carreras endpoint used; consider using authenticated GET /carreras/:rut instead.");
     // Re-implementing for completeness based on original code
     const { rut, email, password } = req.body;
     const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
     try {
         const loginResponse = await fetch(loginUrl, { method: 'GET' });
         if (!loginResponse.ok) { /* ... error handling ... */ return res.status(401).json({ error: 'Credenciales inválidas' }); }
         const ct = loginResponse.headers.get('content-type') || '';
         if (!ct.includes('application/json')) { /* ... error handling ... */ return res.status(502).json({ error: 'Respuesta inesperada' }); }
         let loginData;
         try { loginData = await loginResponse.json(); }
         catch (e) { /* ... error handling ... */ return res.status(502).json({ error: 'Respuesta no válida' }); }
         if (loginData.error || !loginData.rut) { return res.status(401).json({ error: 'Credenciales inválidas' }); }

         // Use the carrera data directly from the login response if available
         if (loginData.carreras) {
             console.log(`[POST /carreras SUCCESS] Data from login response for ${rut}`);
             res.json({
                 rut: loginData.rut,
                 carreras: loginData.carreras,
                 meta: { source: 'puclaro-login', fetchedAt: new Date().toISOString() }
             });
         } else {
             // Fallback to example if login response structure changed
             console.log('[POST /carreras WARN] No carrera data in login response, returning fallback.');
              const fallbackData = {
                 rut: rut,
                 carreras: [ { codigo: "8266", nombre: "ITI-Fallback", catalogo: "202410" } ],
                 meta: { source: 'fallback-data', fetchedAt: new Date().toISOString() }
             };
             res.json(fallbackData);
         }
     } catch (err) {
         console.error('[POST /carreras ERROR]:', err);
         res.status(500).json({ error: 'Error al obtener datos de carrera via POST', detalle: err.message });
     }
});

// Endpoint GET /carreras-autenticado/:rut (redundant?)
// This seems overly complex, requiring credentials in query params for a GET request,
// and overlaps with the authenticated GET /carreras/:rut. Consider removing.
app.get('/carreras-autenticado/:rut', async (req, res) => {
     console.warn("[WARN] GET /carreras-autenticado/:rut endpoint used; very insecure (creds in URL). Consider removing.");
     // ... (implementation as before, but highly discouraged) ...
      res.status(501).json({ error: "Endpoint obsoleto y potencialmente inseguro. Usar GET /carreras/:rut con sesión." });
});

// ------------------------
// Proyecciones endpoints
// ------------------------

// Save a projection for the authenticated user
app.post('/proyeccion', authenticateSession, (req, res) => {
    const { codigoCarrera, name, projection } = req.body || {};
    if (!projection || !codigoCarrera) {
        return res.status(400).json({ error: 'Falta codigoCarrera o projection en el cuerpo' });
    }

    try {
        const id = crypto.randomBytes(8).toString('hex');
        const now = Date.now();
        const obj = {
            id,
            userId: req.session.userId,
            codigoCarrera,
            name: name || `proyeccion_${codigoCarrera}_${now}`,
            projection,
            createdAt: now,
            updatedAt: now
        };
        proyecciones.push(obj);
        saveProyeccionesToDisk();
        res.json({ id, createdAt: new Date(now).toISOString() });
    } catch (err) {
        console.error('[PROYECCION SAVE ERROR]', err);
        res.status(500).json({ error: 'Error interno guardando proyección' });
    }
});

// List projections for the authenticated user (optional filter by codigo)
app.get('/proyeccion', authenticateSession, (req, res) => {
    const codigo = req.query.codigo;
    try {
        const list = proyecciones.filter(p => p.userId === req.session.userId && (!codigo || p.codigoCarrera === codigo));
        res.json({ proyecciones: list, meta: { count: list.length } });
    } catch (err) {
        console.error('[PROYECCION LIST ERROR]', err);
        res.status(500).json({ error: 'Error interno listando proyecciones' });
    }
});

// Get a single projection by id (only owner can access)
app.get('/malla/:mallaId', async (req, res) => {
    const { mallaId } = req.params;
    // Basic validation for the mallaId format
    if (!mallaId || !/^\d+-\d+$/.test(mallaId)) {
        return res.status(400).json({ error: 'Formato de ID de malla inválido. Use {codigo}-{catalogo}.' });
    }

    // If no HAWAII_AUTH is provided, prefer returning a local fallback immediately (dev-friendly)
    const hawaiiAuthToken = process.env.HAWAII_AUTH;
    const targetUrl = `https://losvilos.ucn.cl/hawaii/api/mallas?${mallaId}`;

    console.log(`[MALLA] Requesting malla for ${mallaId} from ${targetUrl} (HAWAII_AUTH ${hawaiiAuthToken ? 'present' : 'missing'})`);

    // If the token is missing, return a local fallback if available, otherwise a clear 503
    if (!hawaiiAuthToken) {
        const fb = getLocalMallaFallback(mallaId);
        if (fb) {
            console.log(`[MALLA FALLBACK] Returning local fallback for ${mallaId} from ${fb.path}`);
            return res.json({ malla: fb.malla, meta: { source: fb.source, fetchedAt: new Date().toISOString() } });
        }
        return res.status(503).json({ error: 'Servicio externo deshabilitado (HAWAII_AUTH no definido) y no se encontró fallback local' });
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'X-HAWAII-AUTH': hawaiiAuthToken
            }
        });

        if (!response.ok) {
            console.error(`[MALLA ERROR HTTP] Failed for ${mallaId}. Status: ${response.status}`);
            let errorDetail = `Status ${response.status}`;
            try {
                const errorBody = await response.json();
                if (errorBody && (errorBody.error || errorBody.message)) errorDetail = errorBody.error || errorBody.message;
            } catch (e) { /* ignore */ }

            // On auth errors or other failures try local fallback
            if (response.status === 401 || response.status === 403) {
                const fb = getLocalMallaFallback(mallaId);
                if (fb) {
                    console.log(`[MALLA FALLBACK] Returning local fallback for ${mallaId} from ${fb.path}`);
                    return res.json({ malla: fb.malla, meta: { source: fb.source, fetchedAt: new Date().toISOString() } });
                }
            }

            return res.status(502).json({ error: 'Error al obtener malla desde servicio externo', detalle: errorDetail });
        }

        const body = await response.json();
        const returned = body.malla || body;
        return res.json({ malla: returned, meta: { source: 'external', fetchedAt: new Date().toISOString() } });

    } catch (err) {
        console.error(`[MALLA ERROR] Exception while fetching malla ${mallaId}:`, err.message);
        const fb = getLocalMallaFallback(mallaId);
        if (fb) {
            console.log(`[MALLA FALLBACK] Returning local fallback for ${mallaId} from ${fb.path}`);
            return res.json({ malla: fb.malla, meta: { source: fb.source, fetchedAt: new Date().toISOString() } });
        }
        return res.status(500).json({ error: 'Error interno al obtener malla', detalle: err.message });
    }
});


