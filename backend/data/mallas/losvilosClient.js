// Cliente ligero para consultar la API de Los Vilos (hawaii)
// Endpoint esperado: https://losvilos.ucn.cl/hawaii/api/mallas?CÓDIGOCARRERA-CATALOGO
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Consulta la API de Los Vilos para obtener la malla indicada.
 * @param {string} codigo - Código de la carrera (ej. "8266")
 * @param {string} catalogo - Catálogo de la malla (ej. "202410")
 * @param {Object} [opts]
 * @param {string} [opts.hawaiiAuthToken] - Token X-HAWAII-AUTH (si no se pasa, toma process.env.HAWAII_AUTH)
 * @returns {Promise<{data: any, meta: {source: string, fetchedAt: string}}>}  
 */
async function getMallaFromLosVilos(codigo, catalogo, opts = {}) {
    if (!codigo || !catalogo) {
        throw new Error('Se requieren código y catálogo para consultar Los Vilos');
    }

    const mallaId = `${codigo}-${catalogo}`;
    const token = opts.hawaiiAuthToken || process.env.HAWAII_AUTH || null;
    // Formato solicitado por el usuario: la API acepta la malla como query string sin clave
    const targetUrl = `https://losvilos.ucn.cl/hawaii/api/mallas?${encodeURIComponent(mallaId)}`;

    const headers = {};
    if (token) headers['X-HAWAII-AUTH'] = token;

    try {
        console.log(`[losvilosClient] Fetching ${mallaId} from ${targetUrl} (auth ${token ? 'present' : 'missing'})`);
        const resp = await fetch(targetUrl, { method: 'GET', headers });

        if (!resp.ok) {
            let bodyText = null;
            try { bodyText = await resp.text(); } catch (e) { /* ignore */ }
            const msg = `Los Vilos returned ${resp.status}` + (bodyText ? `: ${bodyText}` : '');
            const err = new Error(msg);
            err.status = resp.status;
            throw err;
        }

        const json = await resp.json();
        const returned = json.malla || json;

        return {
            data: returned,
            meta: { source: 'losvilos.ucn.cl', fetchedAt: new Date().toISOString() }
        };

    } catch (err) {
        console.error('[losvilosClient] Error fetching malla:', err && err.message ? err.message : err);
        if (err.status) throw err; // rethrow HTTP-like errors
        throw Object.assign(new Error('Error interno al consultar Los Vilos'), { detalle: err.message || String(err) });
    }
}

module.exports = { getMallaFromLosVilos };
