const logoutButton = document.getElementById('logout');



export async function salirLogout(directo ,direccion = "./login.html" ) {
    localStorage.clear();
    // Si tienes un endpoint /logout en el backend, puedes llamarlo aquí
    // await fetch('http://localhost:3001/logout', { method: 'POST', credentials: 'include' });
    alert('HAS CERRADO SESION EXITOSAMENTE');
    window.location.href = direccion || directo;
}

logoutButton.addEventListener('click', (event) => {
     const valor = event.target.dataset.id; 
    console.log("conchetumare")
    // ---- LÍNEA CLAVE DE DEPURACIÓN ----
    console.log("Se intentará navegar con este valor:", valor);
    salirLogout()
});