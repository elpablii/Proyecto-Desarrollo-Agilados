// Versión simplificada del cliente de autenticación para diagnosticar
class AuthClient {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
    }

    async login(email, password) {
        try {
            console.log('AuthClient: Intentando login...');
            
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            console.log('AuthClient: Respuesta recibida:', response.status);

            const data = await response.json();
            console.log('AuthClient: Datos recibidos:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            // Almacenar información mínima
            sessionStorage.setItem('userRut', data.rut);
            sessionStorage.setItem('loginTime', Date.now().toString());
            if (data.meta && data.meta.sessionExpires) {
                sessionStorage.setItem('sessionExpires', data.meta.sessionExpires);
            }

            return {
                success: true,
                rut: data.rut,
                expiresAt: data.meta ? data.meta.sessionExpires : null
            };

        } catch (error) {
            console.error('AuthClient: Error en login:', error);
            throw error;
        }
    }

    async isAuthenticated() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/status`, {
                method: 'GET',
                credentials: 'include'
            });

            return response.ok;
        } catch (error) {
            console.error('AuthClient: Error verificando autenticación:', error);
            return false;
        }
    }

    getCurrentUser() {
        return sessionStorage.getItem('userRut');
    }

    async checkExistingSession() {
        const rut = this.getCurrentUser();
        if (!rut) return false;
        return await this.isAuthenticated();
    }
}

// Crear instancia global
const authClient = new AuthClient();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthClient, authClient };
}
