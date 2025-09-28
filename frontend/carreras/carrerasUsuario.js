import {saludoUsuario} from '../manejoDatos.js';
import { salirLogout } from '../logout.js';

document.addEventListener('DOMContentLoaded', async () => {
    const rut = localStorage.getItem("rutUsuario");
    saludoUsuario(rut);
    
    // Cargar datos de carrera del usuario
    await cargarDatosCarrera(rut);
});

// Función para cargar los datos de carrera del usuario
async function cargarDatosCarrera(rut) {
    if (!rut) {
        console.error('No hay RUT de usuario disponible');
        mostrarError('No hay usuario autenticado');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/carreras/${rut}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Error al obtener datos de carrera:', data.error);
            mostrarError('Error al cargar datos de carrera: ' + data.error);
        } else {
            mostrarDatosCarrera(data);
        }
    } catch (error) {
        console.error('Error al realizar la solicitud:', error);
        mostrarError('Error de conexión al cargar datos de carrera');
    }
}

// Función para mostrar los datos de carrera en la interfaz
function mostrarDatosCarrera(datos) {
    const contenedor = document.getElementById('datos-carrera');
    if (!contenedor) {
        console.error('Contenedor de datos de carrera no encontrado');
        return;
    }

    contenedor.innerHTML = '';

    // Verificar si el JSON tiene la estructura esperada
    if (datos && datos.carreras && Array.isArray(datos.carreras)) {
        if (datos.carreras.length === 0) {
            mostrarMensaje('No tienes carreras registradas');
            return;
        }

        // Mostrar información del RUT
        const rutInfo = document.createElement('div');
        rutInfo.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6';
        rutInfo.innerHTML = `
            <h2 class="text-lg font-semibold text-blue-800 mb-2">Información del Estudiante</h2>
            <p class="text-blue-700"><strong>RUT:</strong> ${datos.rut}</p>
        `;
        contenedor.appendChild(rutInfo);

        // Mostrar cada carrera
        datos.carreras.forEach((carrera, index) => {
            const carreraElement = crearElementoCarrera(carrera, index);
            contenedor.appendChild(carreraElement);
        });
    } else if (Array.isArray(datos) && datos.length > 0) {
        // Si es un array directo de carreras (formato alternativo)
        datos.forEach((carrera, index) => {
            const carreraElement = crearElementoCarrera(carrera, index);
            contenedor.appendChild(carreraElement);
        });
    } else if (datos && typeof datos === 'object') {
        // Si es un objeto con datos de carrera individual
        const carreraElement = crearElementoCarrera(datos);
        contenedor.appendChild(carreraElement);
    } else {
        mostrarMensaje('No se encontraron datos de carrera disponibles');
    }
}

// Función para crear un elemento HTML con los datos de una carrera
function crearElementoCarrera(carrera, index = 0) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200 hover:shadow-lg transition-shadow duration-300';
    
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
        { clave: 'nombre', etiqueta: 'Nombre', valor: carrera.nombre },
        { clave: 'catalogo', etiqueta: 'Catálogo', valor: carrera.catalogo }
    ];
    
    campos.forEach(({ clave, etiqueta, valor }) => {
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
    
    // Si hay campos adicionales que no están en el formato estándar
    Object.entries(carrera).forEach(([clave, valor]) => {
        if (valor && !['codigo', 'nombre', 'catalogo'].includes(clave)) {
            const campo = document.createElement('div');
            campo.className = 'flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0';
            
            const etiquetaElement = document.createElement('span');
            etiquetaElement.className = 'font-semibold text-gray-700';
            etiquetaElement.textContent = formatearEtiqueta(clave) + ':';
            
            const valorElement = document.createElement('span');
            valorElement.className = 'text-gray-900 font-medium';
            valorElement.textContent = valor;
            
            campo.appendChild(etiquetaElement);
            campo.appendChild(valorElement);
            detalles.appendChild(campo);
        }
    });
    
    div.appendChild(titulo);
    div.appendChild(detalles);
    
    return div;
}

// Función para formatear las etiquetas de los campos
function formatearEtiqueta(clave) {
    const etiquetas = {
        'codigo': 'Código',
        'nombre': 'Nombre',
        'catalogo': 'Catálogo',
        'nombre_carrera': 'Nombre de Carrera',
        'facultad': 'Facultad',
        'estado': 'Estado',
        'semestre': 'Semestre',
        'año': 'Año',
        'promedio': 'Promedio',
        'creditos': 'Créditos',
        'jornada': 'Jornada',
        'modalidad': 'Modalidad'
    };
    
    return etiquetas[clave] || clave.charAt(0).toUpperCase() + clave.slice(1);
}

// Función para mostrar errores
function mostrarError(mensaje) {
    const contenedor = document.getElementById('datos-carrera');
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> ${mensaje}
            </div>
        `;
    }
}

// Función para mostrar mensajes informativos
function mostrarMensaje(mensaje) {
    const contenedor = document.getElementById('datos-carrera');
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                ${mensaje}
            </div>
        `;
    }
}

// Event listeners
const logoutButton = document.getElementById('logout');
logoutButton.addEventListener('click', () => {
    salirLogout('../login.html');
});

// Botón para recargar datos
const recargarButton = document.getElementById('recargar-datos');
recargarButton.addEventListener('click', async () => {
    const rut = localStorage.getItem("rutUsuario");
    if (rut) {
        // Mostrar indicador de carga
        const contenedor = document.getElementById('datos-carrera');
        contenedor.innerHTML = `
            <div class="flex justify-center items-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600">Recargando datos...</span>
            </div>
        `;
        
        await cargarDatosCarrera(rut);
    } else {
        mostrarError('No hay usuario autenticado');
    }
});
