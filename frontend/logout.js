const logoutButton = document.getElementById('logout');

logoutButton.addEventListener('click', async () => {
    localStorage.clear();
    // Si tienes un endpoint /logout en el backend, puedes llamarlo aquí
    // await fetch('http://localhost:3001/logout', { method: 'POST', credentials: 'include' });
    alert('HAS CERRADO SESION EXITOSAMENTE');
    window.location.href = './login.html';
});