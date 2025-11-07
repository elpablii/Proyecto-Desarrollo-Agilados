/**
 * Cliente para obtener y renderizar detalles de carrera del usuario
 * Maneja autenticación, obtención de datos y renderizado del DOM
 */

import { authClient } from './authClient.js';
import { API_BASE_URL } from './config.js';

class CareerDetailsClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.userId = null;
        this.careerData = null;
    }

    /**
     * Inicializa el cliente y obtiene las credenciales del usuario
     */
    async initialize() {
        try {
            // Verificar autenticación usando el cliente de autenticación
            const isAuthenticated = await authClient.isAuthenticated();
            
            if (!isAuthenticated) {
                throw new Error('No hay usuario autenticado');
            }

            // Obtener RUT del usuario autenticado
            this.userId = authClient.getCurrentUser();
            
            if (!this.userId) {
                throw new Error('No se pudo obtener el RUT del usuario');
            }
            
            console.log(`Cliente inicializado para usuario: ${this.userId}`);
            return true;
        } catch (error) {
            console.error('Error al inicializar el cliente:', error);
            this.showError('Error de autenticación: ' + error.message);
            return false;
        }
    }

    /**
     * Obtiene los datos de carrera del usuario desde la API
     * @returns {Object} Datos de carrera del usuario
     */
    async fetchCareerData() {
        if (!this.userId) {
            throw new Error('Usuario no autenticado');
        }

        try {
            console.log(`Obteniendo datos de carrera para RUT: ${this.userId}`);
            
            // Usar el cliente de autenticación para hacer peticiones autenticadas
            const response = await authClient.authenticatedFetch(`${this.baseUrl}/carreras/${this.userId}`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.careerData = data;
            console.log('Datos de carrera obtenidos:', data);
            return data;
            
        } catch (error) {
            console.error('Error al obtener datos de carrera:', error);
            
            // Si es un error de conexión, mostrar mensaje más amigable
            if (error.message.includes('Error de conexión')) {
                throw new Error('Error de conexión al servidor. Verifica que el backend esté ejecutándose.');
            }
            
            throw error;
        }
    }

    /**
     * Renderiza los datos de carrera en el DOM
     * @param {Object} data - Datos de carrera a renderizar
     * @param {string} containerId - ID del contenedor donde renderizar
     */
    renderCareerDetails(data, containerId = 'career-details-container') {
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error(`Contenedor con ID '${containerId}' no encontrado`);
            return;
        }

        // Limpiar contenedor
        container.innerHTML = '';

        try {
            if (!data || !data.carreras || !Array.isArray(data.carreras)) {
                this.renderNoDataMessage(container);
                return;
            }

            if (data.carreras.length === 0) {
                this.renderEmptyMessage(container);
                return;
            }

            // Renderizar información del usuario
            this.renderUserInfo(container, data);

            // Renderizar cada carrera
            data.carreras.forEach((carrera, index) => {
                const carreraElement = this.createCareerElement(carrera, index);
                container.appendChild(carreraElement);
            });

            // Renderizar metadatos si están disponibles
            if (data.meta) {
                this.renderMetadata(container, data.meta);
            }

        } catch (error) {
            console.error('Error al renderizar datos de carrera:', error);
            this.showError('Error al mostrar los datos de carrera');
        }
    }

    /**
     * Crea un elemento HTML para una carrera específica
     * @param {Object} carrera - Datos de la carrera
     * @param {number} index - Índice de la carrera
     * @returns {HTMLElement} Elemento HTML de la carrera
     */
    createCareerElement(carrera, index) {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1';
        
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
        
        // Campos estándar de carrera
        const campos = [
            { clave: 'codigo', etiqueta: 'Código de Carrera', valor: carrera.codigo },
            { clave: 'nombre', etiqueta: 'Nombre', valor: carrera.nombre },
            { clave: 'catalogo', etiqueta: 'Catálogo', valor: carrera.catalogo }
        ];
        
        campos.forEach(({ clave, etiqueta, valor }) => {
            if (valor) {
                const campo = this.createFieldElement(etiqueta, valor);
                detalles.appendChild(campo);
            }
        });
        
        // Campos adicionales
        Object.entries(carrera).forEach(([clave, valor]) => {
            if (valor && !['codigo', 'nombre', 'catalogo'].includes(clave)) {
                const etiqueta = this.formatFieldLabel(clave);
                const campo = this.createFieldElement(etiqueta, valor);
                detalles.appendChild(campo);
            }
        });
        
        div.appendChild(titulo);
        div.appendChild(detalles);
        
        return div;
    }

    /**
     * Crea un elemento de campo con etiqueta y valor
     * @param {string} etiqueta - Etiqueta del campo
     * @param {string} valor - Valor del campo
     * @returns {HTMLElement} Elemento HTML del campo
     */
    createFieldElement(etiqueta, valor) {
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
        
        return campo;
    }

    /**
     * Renderiza la información del usuario
     * @param {HTMLElement} container - Contenedor donde renderizar
     * @param {Object} data - Datos que contienen el RUT
     */
    renderUserInfo(container, data) {
        const userInfo = document.createElement('div');
        userInfo.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6';
        userInfo.innerHTML = `
            <h2 class="text-lg font-semibold text-blue-800 mb-2">Información del Estudiante</h2>
            <p class="text-blue-700"><strong>RUT:</strong> ${data.rut}</p>
            <p class="text-blue-700"><strong>Total de Carreras:</strong> ${data.carreras.length}</p>
        `;
        container.appendChild(userInfo);
    }

    /**
     * Renderiza metadatos de la respuesta
     * @param {HTMLElement} container - Contenedor donde renderizar
     * @param {Object} meta - Metadatos
     */
    renderMetadata(container, meta) {
        const metadata = document.createElement('div');
        metadata.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6 text-sm text-gray-600';
        
        let metaContent = '<h3 class="font-semibold text-gray-800 mb-2">Información de la Consulta</h3>';
        
        if (meta.source) {
            metaContent += `<p><strong>Fuente:</strong> ${meta.source}</p>`;
        }
        
        if (meta.fetchedAt) {
            const fecha = new Date(meta.fetchedAt).toLocaleString('es-CL');
            metaContent += `<p><strong>Consultado:</strong> ${fecha}</p>`;
        }
        
        metadata.innerHTML = metaContent;
        container.appendChild(metadata);
    }

    /**
     * Renderiza mensaje cuando no hay datos
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    renderNoDataMessage(container) {
        container.innerHTML = `
            <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <strong>Sin datos:</strong> No se encontraron datos de carrera disponibles
            </div>
        `;
    }

    /**
     * Renderiza mensaje cuando no hay carreras registradas
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    renderEmptyMessage(container) {
        container.innerHTML = `
            <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                No tienes carreras registradas
            </div>
        `;
    }

    /**
     * Muestra un mensaje de error
     * @param {string} message - Mensaje de error
     * @param {string} containerId - ID del contenedor donde mostrar el error
     */
    showError(message, containerId = 'career-details-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }

    /**
     * Muestra un indicador de carga
     * @param {string} containerId - ID del contenedor donde mostrar la carga
     * @param {string} message - Mensaje de carga
     */
    showLoading(containerId = 'career-details-container', message = 'Cargando datos de carrera...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="flex justify-center items-center py-12">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span class="ml-3 text-gray-600">${message}</span>
                </div>
            `;
        }
    }

    /**
     * Formatea las etiquetas de los campos
     * @param {string} clave - Clave del campo
     * @returns {string} Etiqueta formateada
     */
    formatFieldLabel(clave) {
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

    /**
     * Método principal para cargar y mostrar datos de carrera
     * @param {string} containerId - ID del contenedor donde renderizar
     * @param {boolean} showLoading - Si mostrar indicador de carga
     */
    async loadAndRenderCareerDetails(containerId = 'career-details-container', showLoading = true) {
        try {
            // Inicializar cliente
            const initialized = await this.initialize();
            if (!initialized) {
                return;
            }

            // Mostrar indicador de carga
            if (showLoading) {
                this.showLoading(containerId);
            }

            // Obtener datos
            const data = await this.fetchCareerData();
            
            // Renderizar datos
            this.renderCareerDetails(data, containerId);
            
        } catch (error) {
            console.error('Error al cargar datos de carrera:', error);
            this.showError(error.message, containerId);
        }
    }

    /**
     * Actualiza los datos de carrera
     * @param {string} containerId - ID del contenedor donde renderizar
     */
    async refreshCareerData(containerId = 'career-details-container') {
        await this.loadAndRenderCareerDetails(containerId, true);
    }

    /**
     * Obtiene los datos de carrera actuales
     * @returns {Object|null} Datos de carrera actuales
     */
    getCurrentCareerData() {
        return this.careerData;
    }

    /**
     * Obtiene el ID del usuario actual
     * @returns {string|null} ID del usuario
     */
    getCurrentUserId() {
        return this.userId;
    }
}

// Exportar la clase para uso en módulos
export default CareerDetailsClient;

// Función de conveniencia para uso directo
export async function initializeCareerDetailsClient(containerId = 'career-details-container') {
    const client = new CareerDetailsClient();
    await client.loadAndRenderCareerDetails(containerId);
    return client;
}
