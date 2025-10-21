// Versión simplificada sin módulos para diagnosticar
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");

    if (!form) {
        console.error("Formulario no encontrado. Asegúrate de que el formulario tenga el id 'login-form'.");
        return;
    }

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
            console.log('Intentando login con:', username);
            
            const response = await fetch("http://localhost:3001/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: username, password }),
            });
            
            console.log('Respuesta del servidor:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            if (data.error) {
                alert("Credenciales incorrectas. Por favor, verifica tu email y contraseña.");
            } else {
                // Almacenar en sessionStorage
                sessionStorage.setItem('userRut', data.rut);
                sessionStorage.setItem('loginTime', Date.now().toString());
                if (data.meta && data.meta.sessionExpires) {
                    sessionStorage.setItem('sessionExpires', data.meta.sessionExpires);
                }
                if (data.token) {
                    sessionStorage.setItem('sessionToken', data.token);
                }
                
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
