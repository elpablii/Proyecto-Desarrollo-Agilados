const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));
app.use(cookieParser());

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const url = `https://puclaro.ucn.cl/eross/avance/login.php?email=${email}&password=${password}`;
    try {
        const response = await fetch(url, { method: 'GET' });
        const data = await response.json();
        // Si la API externa envía cookies, puedes reenviarlas aquí
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            res.setHeader('Set-Cookie', setCookie);
        }
        res.json(data);
    } catch (err) {
        console.error('Error al conectar con UCN:', err);
        res.status(500).json({ error: 'Error al conectar con UCN', detalle: err.message });
    }
});

// Endpoint para obtener datos de carrera del usuario
app.get('/carreras/:rut', async (req, res) => {
    const { rut } = req.params;
    const url = `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${rut}`;
    try {
        const response = await fetch(url, { method: 'GET' });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Error al obtener datos de carrera:', err);
        res.status(500).json({ error: 'Error al obtener datos de carrera', detalle: err.message });
    }
});

// Endpoint alternativo para obtener datos de carrera con autenticación
app.post('/carreras', async (req, res) => {
    const { rut, email, password } = req.body;
    // Primero autenticamos al usuario
    const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${email}&password=${password}`;
    try {
        const loginResponse = await fetch(loginUrl, { method: 'GET' });
        const loginData = await loginResponse.json();
        
        if (loginData.error) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Si la autenticación es exitosa, obtenemos los datos de carrera
        const carrerasUrl = `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${rut}`;
        const carrerasResponse = await fetch(carrerasUrl, { method: 'GET' });
        const carrerasData = await carrerasResponse.json();
        
        res.json(carrerasData);
    } catch (err) {
        console.error('Error al obtener datos de carrera:', err);
        res.status(500).json({ error: 'Error al obtener datos de carrera', detalle: err.message });
    }
});

app.listen(3001, () => console.log('Backend intermedio corriendo en http://localhost:3001'));
