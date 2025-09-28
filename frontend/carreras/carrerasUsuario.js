import {saludoUsuario} from '../manejoDatos.js';
import { salirLogout } from '../logout.js';

document.addEventListener('DOMContentLoaded', () => {
    const rut = localStorage.getItem("rutUsuario");
    manejoDatos.saludoUsuario(rut);
});


logoutButton = document.getElementById('logout');
logoutButton.addEventListener('click', () => {
    salirLogout('../login.html')});
