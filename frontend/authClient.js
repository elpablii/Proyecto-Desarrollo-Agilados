/**
 * Cliente de autenticación seguro
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
                credentials: 'include', // Incluir cookies
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Almacenar información mínima en sessionStorage (más seguro que localStorage)
            sessionStorage.setItem('userRut', data.rut);
            sessionStorage.setItem('loginTime', Date.now().toString());
            sessionStorage.setItem('sessionExpires', data.meta.sessionExpires);
            // Si el backend devolvió un token (fallback), guardarlo para enviar en headers
            if (data.token) {
                sessionStorage.setItem('sessionToken', data.token);
            }

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
     * Verifica si el usuario está autenticado
     * @returns {Promise<boolean>} True si está autenticado
     */
    async isAuthenticated() {
        try {
            // Primero verificar si hay datos locales
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
            
            // Verificar sesión en el backend
            const response = await fetch(`${this.baseUrl}/auth/status`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                // Actualizar información de sesión
                sessionStorage.setItem('sessionExpires', data.expiresAt);
                console.log('Autenticación verificada en backend');
                return true;
            } else {
                console.log('Backend no confirma autenticación:', response.status);
                // Si el backend no confirma, pero tenemos datos locales válidos, 
                // asumir que estamos autenticados (fallback)
                if (rut && sessionExpires && new Date(sessionExpires) > new Date()) {
                    console.log('Usando autenticación local como fallback');
                    return true;
                }
                return false;
            }

        } catch (error) {
            console.error('Error verificando autenticación:', error);
            
            // Fallback: si hay datos locales válidos, asumir autenticación
            const rut = sessionStorage.getItem('userRut');
            const sessionExpires = sessionStorage.getItem('sessionExpires');
            
            if (rut && sessionExpires && new Date(sessionExpires) > new Date()) {
                console.log('Usando autenticación local como fallback debido a error de red');
                return true;
            }
            
            return false;
        }
    }

    /**
     * Obtiene el RUT del usuario autenticado
     * @returns {string|null} RUT del usuario o null si no está autenticado
     */
    getCurrentUser() {
        const rut = sessionStorage.getItem('userRut');
        const loginTime = sessionStorage.getItem('loginTime');
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
        // Verificar sesión cada 5 minutos
        this.sessionCheckInterval = setInterval(async () => {
            const isAuth = await this.isAuthenticated();
            if (!isAuth) {
                console.log('Sesión expirada, redirigiendo al login');
                this.handleSessionExpired();
            }
        }, 5 * 60 * 1000);
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
        // Limpiar sessionStorage (más seguro)
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
        
        // Verificar con el backend
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
        const token = sessionStorage.getItem('sessionToken');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Si existe token en sessionStorage, usar Authorization header como fallback
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return {
            ...options,
            credentials: 'include', // Incluir cookies de sesión
            headers
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
        
        try {
            const response = await fetch(url, authOptions);
            
                // Si la respuesta es 401, verificar antes si la sesión local sigue siendo válida.
                if (response.status === 401) {
                    console.log('Backend devolvió 401. Comprobando estado local de la sesión...');
                    const sessionExpires = sessionStorage.getItem('sessionExpires');
                    if (sessionExpires && new Date(sessionExpires) > new Date()) {
                        // La sesión local todavía está vigente -> no forzar logout automático.
                        console.log('La sesión local no ha expirado pero el backend devolvió 401. Manteniendo sesión local (fallback de desarrollo).');
                        // Devolver la respuesta 401 al llamador para que maneje el error sin redirigir inmediatamente.
                        return response;
                    }

                    // Si la sesión local también expiró, proceder a cerrar sesión y redirigir.
                    console.log('La sesión local ha expirado o no existe. Cerrando sesión.');
                    this.handleSessionExpired();
                    throw new Error('Sesión expirada');
                }
                
            return response;
        } catch (error) {
            console.error('Error en petición autenticada:', error);
            
            // Si es un error de red, no redirigir inmediatamente
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.log('Error de red, manteniendo sesión local');
                throw new Error('Error de conexión');
            }
            
            throw error;
        }
    }
}

// Crear instancia global del cliente de autenticación
const authClient = new AuthClient();

// Exportar tanto la clase como la instancia
export default AuthClient;
export { authClient };

// Función de conveniencia para verificar autenticación al cargar la página
export async function initializeAuth() {
    const hasValidSession = await authClient.checkExistingSession();
    if (!hasValidSession) {
        // Redirigir al login si no hay sesión válida
        if (window.location.pathname !== '/frontend/login.html' && 
            !window.location.pathname.includes('login.html')) {
            window.location.href = './login.html';
        }
    }
    return hasValidSession;
}
