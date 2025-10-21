import { authClient } from './authClient.js';

const logoutButton = document.getElementById('logout');

/**
 * Función para cerrar sesión de forma segura
 * @param {string} redirectUrl - URL a la que redirigir después del logout
 */
// Usar ruta absoluta a login para evitar 404 desde páginas anidadas
export async function salirLogout(redirectUrl = "/frontend/login.html") {
    try {
        // Mostrar indicador de carga
        if (logoutButton) {
            logoutButton.disabled = true;
            logoutButton.textContent = "Cerrando sesión...";
        }

        // Cerrar sesión usando el cliente de autenticación
        const success = await authClient.logout();
        
        if (success) {
            alert('Has cerrado sesión exitosamente');
        } else {
            alert('Sesión cerrada localmente (error de conexión)');
        }
        
        // Redirigir al login
        window.location.href = redirectUrl;
        
    } catch (error) {
        console.error('Error durante el logout:', error);
        alert('Error al cerrar sesión, pero se ha limpiado la sesión local');
        window.location.href = redirectUrl;
    }
}

// Event listener para el botón de logout
if (logoutButton) {
    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        await salirLogout();
    });
}