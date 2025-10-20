// Versión simplificada del login que usa el cliente simplificado
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");

    if (!form) {
        console.error("Formulario no encontrado. Asegúrate de que el formulario tenga el id 'login-form'.");
        return;
    }

    // Verificar si ya hay una sesión válida
    authClient.checkExistingSession().then(hasSession => {
        if (hasSession) {
            console.log('Sesión existente encontrada, redirigiendo...');
            window.location.href = "./dePrueba.html";
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        // Validación básica
        if (!username || !password) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        // Deshabilitar el formulario durante el login
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Iniciando sesión...";

        try {
            console.log('Intentando login con authClient...');
            const result = await authClient.login(username, password);
            
            if (result.success) {
                alert("¡Login exitoso! Redirigiendo...");
                window.location.href = "./dePrueba.html";
            }
        } catch (error) {
            console.error("Error al realizar la solicitud:", error);
            
            if (error.message.includes('Credenciales inválidas')) {
                alert("Credenciales incorrectas. Por favor, verifica tu email y contraseña.");
            } else if (error.message.includes('Error al conectar')) {
                alert("Error de conexión. Verifica que el servidor esté funcionando.");
            } else {
                alert("Hubo un problema al intentar iniciar sesión. Inténtalo nuevamente.");
            }
        } finally {
            // Rehabilitar el formulario
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
});
