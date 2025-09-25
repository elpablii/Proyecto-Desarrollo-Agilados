const nombre = localStorage.getItem("nombreUsuario");

if (nombre) {
    // Agrega el nombre al header o donde quieras mostrarlo
    const header = documentgetElementById("header");
    if (header) {
        const saludo = document.createElement("h1");
        saludo.textContent = `Bienvenido, ${nombre}!`;
        saludo.className = "text-white font-bold ml-4 my-auto";
        header.insertBefore(saludo, header.firstChild);
    }
}