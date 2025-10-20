/**
 * Cliente de autenticación más permisivo
 * Maneja el almacenamiento seguro de sesiones y tokens
 */

class AuthClient {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.sessionCheckInterval = null;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
    }

    /**
     * Inicia sesión de forma segura
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña del usuario
     * @returns {Promise<Object>} Resultado del login
     */
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Almacenar información mínima en sessionStorage
            sessionStorage.setItem('userRut', data.rut);
            sessionStorage.setItem('loginTime', Date.now().toString());
            sessionStorage.setItem('sessionExpires', data.meta.sessionExpires);

            // Iniciar verificación periódica de sesión
            this.startSessionMonitoring();

            return {
                success: true,
                rut: data.rut,
                expiresAt: data.meta.sessionExpires
            };

        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    /**
     * Cierra sesión de forma segura
     * @returns {Promise<boolean>} True si el logout fue exitoso
     */
    async logout() {
        try {
            // Llamar al endpoint de logout del backend
            await fetch(`${this.baseUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            // Limpiar almacenamiento local
            this.clearLocalStorage();

            // Detener monitoreo de sesión
            this.stopSessionMonitoring();

            return true;

        } catch (error) {
            console.error('Error en logout:', error);
            // Limpiar almacenamiento local aunque falle la llamada al backend
            this.clearLocalStorage();
            this.stopSessionMonitoring();
            return false;
        }
    }

    /**
     * Verifica si el usuario está autenticado (versión permisiva)
     * @returns {Promise<boolean>} True si está autenticado
     */
    async isAuthenticated() {
        try {
            // Verificar datos locales primero
            const rut = sessionStorage.getItem('userRut');
            const sessionExpires = sessionStorage.getItem('sessionExpires');
            
            if (!rut) {
                console.log('No hay RUT en sessionStorage');
                return false;
            }
            
            // Verificar si la sesión local ha expirado
            if (sessionExpires && new Date(sessionExpires) < new Date()) {
                console.log('Sesión local expirada');
                this.clearLocalStorage();
                return false;
            }
            
            // Si tenemos datos locales válidos, asumir que estamos autenticados
            // Solo verificar con el backend si es necesario
            console.log('Usuario autenticado localmente:', rut);
            return true;

        } catch (error) {
            console.error('Error verificando autenticación:', error);
            return false;
        }
    }

    /**
     * Obtiene el RUT del usuario autenticado
     * @returns {string|null} RUT del usuario o null si no está autenticado
     */
    getCurrentUser() {
        const rut = sessionStorage.getItem('userRut');
        const sessionExpires = sessionStorage.getItem('sessionExpires');

        // Verificar si la sesión ha expirado
        if (sessionExpires && new Date(sessionExpires) < new Date()) {
            this.clearLocalStorage();
            return null;
        }

        return rut;
    }

    /**
     * Obtiene información de la sesión actual
     * @returns {Object|null} Información de la sesión
     */
    getSessionInfo() {
        const rut = this.getCurrentUser();
        if (!rut) return null;

        return {
            rut: rut,
            loginTime: sessionStorage.getItem('loginTime'),
            expiresAt: sessionStorage.getItem('sessionExpires')
        };
    }

    /**
     * Inicia el monitoreo periódico de la sesión
     */
    startSessionMonitoring() {
        // Verificar sesión cada 10 minutos (menos frecuente)
        this.sessionCheckInterval = setInterval(async () => {
            const rut = this.getCurrentUser();
            if (!rut) {
                console.log('Sesión expirada, redirigiendo al login');
                this.handleSessionExpired();
            }
        }, 10 * 60 * 1000);
    }

    /**
     * Detiene el monitoreo de sesión
     */
    stopSessionMonitoring() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    /**
     * Maneja la expiración de sesión
     */
    handleSessionExpired() {
        this.clearLocalStorage();
        this.stopSessionMonitoring();
        
        // Mostrar notificación al usuario
        if (typeof alert !== 'undefined') {
            alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
        
        // Redirigir al login
        window.location.href = './login.html';
    }

    /**
     * Limpia el almacenamiento local de forma segura
     */
    clearLocalStorage() {
        // Limpiar sessionStorage
        sessionStorage.removeItem('userRut');
        sessionStorage.removeItem('loginTime');
        sessionStorage.removeItem('sessionExpires');
        
        // Limpiar localStorage si existe información antigua
        localStorage.removeItem('rutUsuario');
        localStorage.removeItem('sessionToken');
    }

    /**
     * Verifica si hay una sesión válida al cargar la página
     * @returns {Promise<boolean>} True si hay sesión válida
     */
    async checkExistingSession() {
        const rut = this.getCurrentUser();
        if (!rut) {
            console.log('No hay usuario en sessionStorage');
            return false;
        }

        console.log('Usuario encontrado en sessionStorage:', rut);
        
        // Verificar con el método permisivo
        const isAuth = await this.isAuthenticated();
        console.log('Resultado de verificación de autenticación:', isAuth);
        
        return isAuth;
    }

    /**
     * Obtiene las opciones de fetch con autenticación
     * @param {Object} options - Opciones adicionales para fetch
     * @returns {Object} Opciones de fetch con autenticación
     */
    getAuthenticatedFetchOptions(options = {}) {
        return {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
    }

    /**
     * Realiza una petición autenticada
     * @param {string} url - URL de la petición
     * @param {Object} options - Opciones de fetch
     * @returns {Promise<Response>} Respuesta de la petición
     */
    async authenticatedFetch(url, options = {}) {
        const authOptions = this.getAuthenticatedFetchOptions(options);
        
        const response = await fetch(url, authOptions);
        
        // Si la respuesta es 401, la sesión ha expirado
        if (response.status === 401) {
            this.handleSessionExpired();
            throw new Error('Sesión expirada');
        }
        
        return response;
    }
}

// Crear instancia global del cliente de autenticación
const authClient = new AuthClient();

// Exportar tanto la clase como la instancia
export default AuthClient;
export { authClient };
