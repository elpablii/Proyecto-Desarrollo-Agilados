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
document.addEventListener("DOMContentLoaded", () => {
    const rut = localStorage.getItem("rutUsuario");
    saludoUsuario(rut); // Llama a la función que ya está definida y exportada.
});