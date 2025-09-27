const rut = localStorage.getItem("rutUsuario");
if (rut) {
    const usuario = document.getElementById("saludo-usuario");
    if (usuario) {
        const saludo = document.createElement("h1");
        saludo.textContent = `Bienvenido, ${rut}!`;
        saludo.className = "text-white font-bold ml-4 my-auto";
        usuario.appendChild(saludo);
    }
}