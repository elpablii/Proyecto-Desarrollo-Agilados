import { authClient } from './authClient-permissive.js';

export function saludoUsuario(rut) {
    if (!rut) return; // Si no hay rut, no hagas nada.

    const usuarioContainer = document.getElementById("saludo-usuario");
    if (usuarioContainer) {
        // Opcional pero recomendado: limpia el contenedor antes de añadir el saludo
        // para evitar que se dupliquen mensajes si se llama la función varias veces.
        usuarioContainer.innerHTML = '';

        const saludo = document.createElement("h1");
        saludo.textContent = `Bienvenido, ${rut}!`;
        saludo.className = "text-white font-bold ml-4 my-auto mt-3";
        usuarioContainer.appendChild(saludo);
    }
}

// 2. EJECUTA la lógica inicial solo cuando el DOM esté listo.
// Esta parte se encarga de mostrar el saludo la primera vez que la página carga.
document.addEventListener("DOMContentLoaded", async () => {
    console.log('Iniciando verificación de autenticación (versión permisiva)...');
    
    // Verificar autenticación antes de mostrar el saludo
    try {
        const isAuthenticated = await authClient.isAuthenticated();
        console.log('Resultado de autenticación:', isAuthenticated);
        
        if (isAuthenticated) {
            const rut = authClient.getCurrentUser();
            console.log('Usuario autenticado:', rut);
            saludoUsuario(rut);
        } else {
            // Si no está autenticado, redirigir al login
            console.log('Usuario no autenticado, redirigiendo al login...');
            window.location.href = './login.html';
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        
        // Fallback: verificar si hay datos locales
        const rut = authClient.getCurrentUser();
        if (rut) {
            console.log('Usando datos locales como fallback');
            saludoUsuario(rut);
        } else {
            console.log('No hay datos locales, redirigiendo al login...');
            window.location.href = './login.html';
        }
    }
});
