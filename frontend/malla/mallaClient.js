// Importa el cliente de autenticación para realizar peticiones autenticadas
import { authClient } from '../authClient.js';
// Importa la URL base de la API desde la configuración
import { API_BASE_URL } from '../config.js';

/**
 * Busca los datos de la malla curricular desde el backend proxy.
 * No requiere autenticación de usuario.
 * @param {string} mallaId - El ID de la malla (ej. "8606-201610")
 * @returns {Promise<Array>} - La lista de asignaturas de la malla.
 */
export async function fetchMalla(mallaId) {
    if (!mallaId) {
        throw new Error('Se requiere un ID de malla (codigo-catalogo).');
    }
    
    const url = `${API_BASE_URL}/malla/${mallaId}`;
    console.log(`[mallaClient] Fetching Malla from: ${url}`);

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const status = response.status;
            console.warn(`[mallaClient] Server returned ${status} when fetching malla:`, errorData);
            // If 401 (unauthorized) or other server-side auth error, try a frontend-local fallback
            if (status === 401 || status === 403) {
                try {
                    console.info('[mallaClient] Intentando cargar malla local de fallback');
                    // Use absolute path so this works regardless of current page location
                    const fallbackResp = await fetch('/malla/malla-fallback.json');
                    if (fallbackResp.ok) {
                        const fallbackData = await fallbackResp.json();
                        console.info('[mallaClient] Malla fallback cargada con éxito');
                        return fallbackData;
                    }
                    console.warn('[mallaClient] No se pudo cargar fallback local, status:', fallbackResp.status);
                } catch (e) {
                    console.warn('[mallaClient] Error cargando fallback local:', e);
                }
            }
            throw new Error(`Error HTTP ${status}: ${errorData?.error || 'No se pudo obtener la malla'}`);
        }

        const data = await response.json();
        
        // La respuesta del proxy envuelve los datos en { malla: [...] }
        if (!data.malla) {
             throw new Error('Respuesta de malla inválida desde el servidor.');
        }
        
        return data.malla; // Devuelve el array de asignaturas
    } catch (error) {
        console.error('[mallaClient] Error en fetchMalla:', error);
        throw error;
    }
}

/**
 * Busca el avance curricular del estudiante desde el backend proxy.
 * Requiere autenticación (usa la sesión del authClient).
 * @param {string} rut - RUT del estudiante
 * @param {string} codigoCarrera - Código de la carrera
 * @returns {Promise<Array>} - La lista de registros de avance.
 */
export async function fetchAvance(rut, codigoCarrera) {
    if (!rut || !codigoCarrera) {
        throw new Error('Se requiere RUT y código de carrera para obtener el avance.');
    }

    // Usa el authenticatedFetch del authClient para incluir la cookie/token de sesión
    const url = `${API_BASE_URL}/avance/${rut}/${codigoCarrera}`;
    console.log(`[mallaClient] Fetching Avance from: ${url}`);
    
    try {
        // authClient.authenticatedFetch maneja la autenticación (cookies/token)
        const response = await authClient.authenticatedFetch(url, {
            method: 'GET'
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => null);
             const errorMessage = errorData?.error || `Error HTTP ${response.status}`;
             
             // Si el avance no se encuentra (404), no es un error fatal, solo no hay datos.
             if (response.status === 404) {
                 console.warn(`[mallaClient] No se encontró avance: ${errorMessage}`);
                 return []; // Devuelve un array vacío
             }
             
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // La respuesta del proxy envuelve los datos en { avance: [...] }
        if (!data.avance) {
            throw new Error('Respuesta de avance inválida desde el servidor.');
        }

        return data.avance; // Devuelve el array de avance
    } catch (error) {
        console.error('[mallaClient] Error en fetchAvance:', error);
        throw error;
    }
}
