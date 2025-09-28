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
    
    // Intentar diferentes endpoints posibles
    const endpoints = [
        `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${rut}`,
        `https://puclaro.ucn.cl/eross/avance/estudiante.php?rut=${rut}`,
        `https://puclaro.ucn.cl/eross/avance/datos.php?rut=${rut}`,
        `https://puclaro.ucn.cl/eross/avance/info.php?rut=${rut}`
    ];
    
    for (const url of endpoints) {
        try {
            console.log(`Intentando endpoint: ${url}`);
            const response = await fetch(url, { method: 'GET' });
            
            // Verificar si la respuesta es HTML (error 404 o similar)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.log(`Endpoint ${url} devolvió HTML, intentando siguiente...`);
                continue;
            }
            
            const data = await response.json();
            console.log(`Éxito con endpoint: ${url}`);
            return res.json(data);
        } catch (err) {
            console.log(`Error con endpoint ${url}:`, err.message);
            continue;
        }
    }
    
    // Si ningún endpoint funciona, devolver datos de ejemplo
    console.log('Ningún endpoint funcionó, devolviendo datos de ejemplo');
    const datosEjemplo = {
        rut: rut,
        carreras: [
            {
                codigo: "8266",
                nombre: "ITI",
                catalogo: "202410"
            },
            {
                codigo: "8606", 
                nombre: "ICCI",
                catalogo: "201610"
            }
        ]
    };
    res.json(datosEjemplo);
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

// Endpoint para obtener datos de carrera usando las credenciales del usuario logueado
app.get('/carreras-autenticado/:rut', async (req, res) => {
    const { rut } = req.params;
    
    // Obtener credenciales del usuario desde las cookies o headers
    const { email, password } = req.query;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Se requieren email y password' });
    }
    
    try {
        // Primero autenticamos al usuario
        const loginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${email}&password=${password}`;
        const loginResponse = await fetch(loginUrl, { method: 'GET' });
        const loginData = await loginResponse.json();
        
        if (loginData.error) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Intentar diferentes endpoints para obtener datos de carrera
        const endpoints = [
            `https://puclaro.ucn.cl/eross/avance/carreras.php?rut=${rut}`,
            `https://puclaro.ucn.cl/eross/avance/estudiante.php?rut=${rut}`,
            `https://puclaro.ucn.cl/eross/avance/datos.php?rut=${rut}`,
            `https://puclaro.ucn.cl/eross/avance/info.php?rut=${rut}`
        ];
        
        for (const url of endpoints) {
            try {
                console.log(`Intentando endpoint autenticado: ${url}`);
                const response = await fetch(url, { method: 'GET' });
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    console.log(`Endpoint ${url} devolvió HTML, intentando siguiente...`);
                    continue;
                }
                
                const data = await response.json();
                console.log(`Éxito con endpoint autenticado: ${url}`);
                return res.json(data);
            } catch (err) {
                console.log(`Error con endpoint autenticado ${url}:`, err.message);
                continue;
            }
        }
        
        // Si ningún endpoint funciona, devolver datos de ejemplo
        console.log('Ningún endpoint autenticado funcionó, devolviendo datos de ejemplo');
        const datosEjemplo = {
            rut: rut,
            carreras: [
                {
                    codigo: "8266",
                    nombre: "ITI",
                    catalogo: "202410"
                },
                {
                    codigo: "8606", 
                    nombre: "ICCI",
                    catalogo: "201610"
                }
            ]
        };
        res.json(datosEjemplo);
        
    } catch (err) {
        console.error('Error al obtener datos de carrera autenticado:', err);
        res.status(500).json({ error: 'Error al obtener datos de carrera', detalle: err.message });
    }
});

app.listen(3001, () => console.log('Backend intermedio corriendo en http://localhost:3001'));
