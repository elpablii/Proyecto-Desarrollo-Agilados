document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");

    if (!form) {
        console.error("Formulario no encontrado. Asegúrate de que el formulario tenga el id 'login-form'.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        const endpoint = "http://localhost:3001/login";

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: username, password }),
            });
            const data = await response.json();
            
            if (data.error) {
                // Redirige a Google si las credenciales son incorrectas
                alert("Credenciales incorrectas. Redirigiendo a Google...");
                window.location.href = "https://www.google.com";
            } else {
                // Redirige a la página de prueba si el login es exitoso
                alert("¡Login exitoso! Redirigiendo...");
                await localStorage.setItem("rutUsuario", data.rut);
                window.location.href = "./dePrueba.html";
            }
        } catch (error) {
            console.error("Error al realizar la solicitud:", error);
            alert("Hubo un problema al intentar iniciar sesión.");
        }
    });
});