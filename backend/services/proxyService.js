// Servicio para manejar la lógica de proxy a APIs externas
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { getLocalMallaFallback } = require('../utils/helpers');

// Obtiene la malla desde el servicio externo o fallback
const fetchMalla = async (codigo, catalogo) => {
    // [CORRECCIÓN] Se elimina el token hardcodeado
    const hawaiiAuthToken = process.env.HAWAII_AUTH;
    const mallaId = `${codigo}-${catalogo}`;
    const targetUrl = `https://losvilos.ucn.cl/hawaii/api/mallas/${codigo}/${catalogo}`;

    console.log(`[MALLA] Requesting malla for ${mallaId} (HAWAII_AUTH ${hawaiiAuthToken ? 'present' : 'missing'})`);

    // [MODIFICADO] Si el token no está en las variables de entorno, falla.
    // Ya no usamos el fallback local si la variable falta.
    if (!hawaiiAuthToken) {
        console.error("[MALLA ERROR] HAWAII_AUTH no está definido en las variables de entorno.");
        throw Object.assign(new Error('Servicio externo deshabilitado (HAWAII_AUTH no definido).'), { status: 503 });
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'X-HAWAII-AUTH': hawaiiAuthToken }
        });

        if (!response.ok) {
            let errorDetail = `Status ${response.status}`;
            try {
                const errorBody = await response.json();
                if (errorBody && (errorBody.error || errorBody.message)) errorDetail = errorBody.error || errorBody.message;
            } catch (e) { /* ign */ }

            // Try fallback for any error status (401, 403, 502, etc.)
            const fb = getLocalMallaFallback(mallaId);
            if (fb) {
                console.log(`[MALLA FALLBACK] Returning local fallback due to error ${response.status}: ${fb.path}`);
                return { data: fb.malla, meta: { source: fb.source, fetchedAt: new Date().toISOString() } };
            }
            throw Object.assign(new Error('Error al obtener malla desde servicio externo'), { status: 502, detalle: errorDetail });
        }

        const body = await response.json();
        const returned = body.malla || body;
        return { data: returned, meta: { source: 'external', fetchedAt: new Date().toISOString() } };

    } catch (err) {
        if (err.status) throw err; // Re-lanzar errores HTTP personalizados

        console.error(`[MALLA ERROR] Exception fetching ${mallaId}:`, err.message);
        const fb = getLocalMallaFallback(mallaId);
        if (fb) {
            console.log(`[MALLA FALLBACK] Returning local fallback due to exception: ${fb.path}`);
            return { data: fb.malla, meta: { source: fb.source, fetchedAt: new Date().toISOString() } };
        }
        throw Object.assign(new Error('Error interno al obtener malla'), { status: 500, detalle: err.message });
    }
};

// Obtiene el avance desde el servicio externo
const fetchAvance = async (rut, codigoCarrera) => {
    const targetUrl = `https://puclaro.ucn.cl/eross/avance/avance.php?rut=${encodeURIComponent(rut)}&codcarrera=${encodeURIComponent(codigoCarrera)}`;

    console.log(`[AVANCE] Requesting avance for ${rut}/${codigoCarrera}`);

    try {
        const response = await fetch(targetUrl, { method: 'GET' });

        if (!response.ok) {
            let errorDetail = `Status ${response.status}`;
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.error) {
                    errorDetail = errorBody.error;
                    if (errorDetail.includes("no encontrado")) {
                        throw Object.assign(new Error(errorDetail), { status: 404 });
                    }
                }
            } catch (e) { if(e.status === 404) throw e; /* ign */ }
            throw Object.assign(new Error(`Error al obtener datos del avance (${response.status})`), { status: response.status, detalle: errorDetail });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw Object.assign(new Error('Respuesta inesperada del servicio de avance (no JSON)'), { status: 502 });
        }

        const data = await response.json();

        if (data && data.error) {
            if (data.error.includes("no encontrado")) {
                throw Object.assign(new Error(data.error), { status: 404 });
            }
            throw Object.assign(new Error(data.error), { status: 400 });
        }

        return {
            data: data, // El proxy anterior lo envolvía en 'avance', lo devolvemos directo
            meta: { source: 'puclaro.ucn.cl', fetchedAt: new Date().toISOString() }
        };

    } catch (err) {
        if (err.status) throw err; // Re-lanzar errores HTTP personalizados
        console.error(`[AVANCE ERROR] Exception for ${rut}/${codigoCarrera}:`, err);
        throw Object.assign(new Error('Error interno del servidor al obtener el avance'), { status: 500, detalle: err.message });
    }
};

module.exports = {
    fetchMalla,
    fetchAvance
};