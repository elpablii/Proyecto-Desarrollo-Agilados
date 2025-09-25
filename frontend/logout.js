const logoutButton = document.getElementById('logout')

logoutButton.addEventListener('click',async () =>{

        localStorage.clear()    
        alert('HAS CERRADO SESION EXITOSAMENTE')

        window.location.href = './login.html'
    })