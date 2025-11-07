// Importa funciones de manejo de datos (saludo) y logout
import { saludoUsuario } from '../manejoDatos.js';
import { salirLogout } from '../logout.js';
// Importa el cliente de autenticación
import { authClient } from '../authClient.js';
// *** CAMBIO: Importar la URL base de la API ***
import { API_BASE_URL } from '../config.js';

/**
 * Event Listener para cuando el DOM esté completamente cargado.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    const isAuthenticated = await authClient.isAuthenticated();
    
    if (!isAuthenticated) {
        console.log('Usuario no autenticado, redirigiendo al login...');
        // *** CAMBIO: Usar ruta absoluta al login ***
    window.location.href = '/login.html'; // Ajusta la ruta al login si es necesario
        return;
    }
    
    // Obtener RUT y saludar al usuario
    const rut = authClient.getCurrentUser();
    saludoUsuario(rut);
    
    // Cargar datos de carrera del usuario
    await cargarDatosCarrera(rut);
});

/**
 * Carga los datos de las carreras del usuario desde el backend proxy.
 * @param {string} rut - RUT del usuario.
 */
async function cargarDatosCarrera(rut) {
    if (!rut) {
        console.error('No hay RUT de usuario disponible');
        mostrarError('No hay usuario autenticado');
        return;
    }

    // Mostrar indicador de carga mientras se obtienen los datos
    const contenedor = document.getElementById('datos-carrera');
    mostrarCarga(contenedor, true); // Mostrar carga
    mostrarError(null, contenedor); // Limpiar errores previos

    try {
        console.log(`Cargando datos de carrera para RUT: ${rut}`);
        // Usar authenticatedFetch para asegurar que la sesión es válida
        // *** CAMBIO: Usar constante API_BASE_URL ***
        const response = await authClient.authenticatedFetch(`${API_BASE_URL}/carreras/${rut}`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        mostrarCarga(contenedor, false); // Ocultar carga
        
        if (data.error) {
            console.error('Error al obtener datos de carrera:', data.error);
            mostrarError('Error al cargar datos de carrera: ' + data.error, contenedor);
        } else {
            // Asegurarnos de que `data.rut` exista en la respuesta
            // Si no existe, usamos el `rut` que ya teníamos de la sesión.
            if (!data.rut) {
                console.warn("La respuesta de /carreras no incluyó un RUT, usando el RUT de la sesión.");
                data.rut = rut; 
            }
            mostrarDatosCarrera(data);
        }
    } catch (error) {
        console.error('Error al realizar la solicitud:', error);
        
        mostrarCarga(contenedor, false); // Ocultar carga
        let mensajeError = error.message;

        // Mostrar mensaje de error más específico
        if (error.message.includes('Error de conexión') || error.message.includes('Failed to fetch')) {
            mensajeError = 'Error de conexión al servidor. Verifica que el backend esté ejecutándose.';
        } else if (error.message.includes('Sesión expirada')) {
            mensajeError = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        }
        
        mostrarError(mensajeError, contenedor);
    }
}

/**
 * Muestra las tarjetas de carreras en la interfaz.
 * @param {object} datos - Objeto de respuesta de la API (espera { rut, carreras: [...] }).
 */
function mostrarDatosCarrera(datos) {
    const contenedor = document.getElementById('datos-carrera');
    if (!contenedor) {
        console.error('Contenedor de datos de carrera no encontrado');
        return;
    }

    contenedor.innerHTML = ''; // Limpiar contenedor (incluyendo spinner)

    // Verificar si el JSON tiene la estructura esperada
    if (datos && datos.carreras && Array.isArray(datos.carreras)) {
        if (datos.carreras.length === 0) {
            mostrarMensaje('No tienes carreras registradas', contenedor);
            return;
        }

        // Mostrar cada carrera como un enlace
        datos.carreras.forEach((carrera, index) => {
            // Pasamos el RUT de `datos.rut` (que viene de la API o del fallback)
            const carreraElement = crearElementoCarrera(carrera, index, datos.rut);
            contenedor.appendChild(carreraElement);
        });
    } else {
        // Manejar respuesta inesperada pero válida
        console.warn("La respuesta de carreras no tiene el formato esperado:", datos);
        mostrarMensaje('No se encontraron datos de carrera disponibles.', contenedor);
    }
}

/**
 * Crea un elemento HTML (enlace) con los datos de una carrera.
 * @param {object} carrera - Objeto de la carrera (codigo, nombre, catalogo).
 * @param {number} index - Índice de la carrera (para el contador).
 * @param {string} rut - RUT del estudiante (necesario para el enlace).
 * @returns {HTMLElement} - Un elemento <a> que funciona como tarjeta.
 */
function crearElementoCarrera(carrera, index = 0, rut) {
    // El elemento principal ahora es un <a> en lugar de un <div>
    const link = document.createElement('a');
    
    // Construir el enlace a la página de la malla
    // Asegurarse de que todos los componentes de la URL están definidos
    const href = `../malla/mallaCarrera.html?rut=${encodeURIComponent(rut || '')}&codigo=${encodeURIComponent(carrera.codigo || '')}&catalogo=${encodeURIComponent(carrera.catalogo || '')}&nombre=${encodeURIComponent(carrera.nombre || '')}`;
    link.href = href;
    
    // Aplicar estilos de tarjeta al enlace
    link.className = 'block bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300';
    
    // Título de la carrera
    const titulo = document.createElement('h3');
    titulo.className = 'text-xl font-bold text-blue-600 mb-4 flex items-center';
    titulo.innerHTML = `
        <span class="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full mr-3">
            ${index + 1}
        </span>
        ${carrera.nombre || 'Carrera'}
    `;
    
    const detalles = document.createElement('div');
    detalles.className = 'space-y-3';
    
    // Campos específicos del formato JSON
    const campos = [
        { clave: 'codigo', etiqueta: 'Código de Carrera', valor: carrera.codigo },
        { clave: 'catalogo', etiqueta: 'Catálogo', valor: carrera.catalogo }
    ];
    
    campos.forEach(({ etiqueta, valor }) => {
        if (valor) {
            const campo = document.createElement('div');
            campo.className = 'flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0';
            
            const etiquetaElement = document.createElement('span');
            etiquetaElement.className = 'font-semibold text-gray-700';
            etiquetaElement.textContent = etiqueta + ':';
            
            const valorElement = document.createElement('span');
            valorElement.className = 'text-gray-900 font-medium';
            valorElement.textContent = valor;
            
            campo.appendChild(etiquetaElement);
            campo.appendChild(valorElement);
            detalles.appendChild(campo);
        }
    });
    
    // Añadir un indicador visual de que es un enlace
    const verMalla = document.createElement('div');
    verMalla.className = 'text-right text-blue-600 font-semibold mt-4 text-sm';
    verMalla.textContent = 'Ver Malla y Avance →';
    
    link.appendChild(titulo);
    link.appendChild(detalles);
    link.appendChild(verMalla); // Añadir el indicador
    
    return link; // Devuelve el elemento <a>
}

/**
 * Muestra u oculta el indicador de carga en un contenedor.
 * @param {HTMLElement} container - El contenedor donde mostrar/ocultar.
 * @param {boolean} mostrar - True para mostrar, false para ocultar.
 */
function mostrarCarga(container, mostrar) {
    if (!container) return;
    
    if (mostrar) {
         container.innerHTML = `
            <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600">Cargando datos de carrera...</span>
            </div>
        `;
    } else {
        // No limpiamos aquí, `mostrarDatosCarrera` o `mostrarError` lo harán.
    }
}

/**
 * Muestra un mensaje de error en el contenedor.
 * @param {string | null} mensaje - El mensaje de error.
 * @param {HTMLElement} container - El contenedor.
 */
function mostrarError(mensaje, container) {
    if (!container) return;
    if (mensaje) {
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> ${mensaje}
            </div>
        `;
    } else {
        container.innerHTML = ''; // Limpiar si el mensaje es nulo
    }
}

/**
 * Muestra un mensaje informativo en el contenedor.
 * @param {string} mensaje - El mensaje.
 * @param {HTMLElement} container - El contenedor.
 */
function mostrarMensaje(mensaje, container) {
    if (!container) return;
    container.innerHTML = `
        <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            ${mensaje}
        </div>
    `;
}

// --- Event Listeners para botones ---
const logoutButton = document.getElementById('logout');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        // Usar la ruta absoluta al login para evitar errores de path
    salirLogout("/login.html");
    });
}

const recargarButton = document.getElementById('recargar-datos');
if (recargarButton) {
    recargarButton.addEventListener('click', async () => {
        const rut = authClient.getCurrentUser();
        if (rut) {
            await cargarDatosCarrera(rut); // Recarga los datos
        } else {
            mostrarError('No hay usuario autenticado', document.getElementById('datos-carrera'));
        }
    });
}



