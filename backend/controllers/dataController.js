const proxyService = require('../services/proxyService');
const { normalizeRut } = require('../utils/helpers');

// Obtiene carreras desde la sesión
const getCarreras = async (req, res) => {
    const { rut } = req.params;
    const sessionUserId = req.session.userId; 
    const sessionCarreras = req.session.carreras;

    // Autorización: El RUT solicitado debe ser el de la sesión
    if (normalizeRut(rut) !== normalizeRut(sessionUserId)) {
         console.warn(`[CARRERAS FORBIDDEN] Session user ${sessionUserId} attempted to access carreras for ${rut}`);
         return res.status(403).json({ error: 'No autorizado para acceder a estas carreras.' });
    }

    console.log(`[CARRERAS] Requesting carreras for ${rut} from session`);

    if (sessionCarreras) {
        res.json({
            rut: sessionUserId,
            carreras: sessionCarreras,
             meta: { source: 'session-cache', fetchedAt: new Date().toISOString() }
        });
    } else {
        console.error(`[CARRERAS ERROR] No 'carreras' found in session for user ${sessionUserId}`);
        res.status(404).json({ error: 'Datos de carrera no encontrados en la sesión.' });
    }
};

// Obtiene la malla (proxy)
const getMalla = async (req, res) => {
    // La validación de formato (regex) se elimina
    const { mallaId } = req.params;

    try {
        const { data, meta } = await proxyService.fetchMalla(mallaId);
        res.json({ malla: data, meta });
    } catch (error) {
        console.error(`[MALLA ERROR] Controller failed for ${mallaId}:`, error.message);
        const status = error.status || 500;
        res.status(status).json({ error: error.message, detalle: error.detalle });
    }
};

// Obtiene el avance (proxy)
const getAvance = async (req, res) => {
    const { rut, codigoCarrera } = req.params;
    const sessionUserId = req.session.userId;

    // Autorización
    if (normalizeRut(rut) !== normalizeRut(sessionUserId)) {
         console.warn(`[AVANCE FORBIDDEN] Session user ${sessionUserId} attempted to access avance for ${rut}`);
         return res.status(403).json({ error: 'No autorizado para acceder a este avance curricular.' });
    }

    try {
        const { data, meta } = await proxyService.fetchAvance(rut, codigoCarrera);
        res.json({ avance: data, meta });
    } catch (error) {
        console.error(`[AVANCE ERROR] Controller failed for ${rut}/${codigoCarrera}:`, error.message);
        const status = error.status || 500;
        res.status(status).json({ error: error.message, detalle: error.detalle });
    }
};

module.exports = {
    getCarreras,
    getMalla,
    getAvance
};