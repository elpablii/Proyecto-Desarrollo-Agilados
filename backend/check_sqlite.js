const axios = require('axios');

const client = axios.create({
    baseURL: 'http://localhost:3001',
    validateStatus: () => true,
    withCredentials: true
});

async function verify() {
    console.log('--- 1. Login Ximena ---');
    const loginResp = await client.post('/login', {
        email: 'ximena@example.com',
        password: 'qwerty'
    });
    console.log('Login Status:', loginResp.status);

    const cookies = loginResp.headers['set-cookie'];
    if (!cookies) return console.error('No cookies!');
    const sessionCookie = cookies.find(c => c.startsWith('ucn_session='));
    const config = { headers: { Cookie: sessionCookie } };

    console.log('\n--- 2. Get ITI Malla (2901) ---');
    const m1 = await client.get('/data/malla/2901/202410');
    console.log('Status:', m1.status);

    console.log('\n--- 3. Save Scenario (SQLite Test) ---');
    const saveResp = await client.post('/proyeccion', {
        userId: '33.333.333-3',
        codigoCarrera: '8266',
        name: 'Escenario SQLite Test',
        projection: [{ course: 'TEST-101', status: 'APROBADO' }]
    }, config);
    console.log('Save Status:', saveResp.status);
    console.log('Save Body:', saveResp.data);

    console.log('\n--- 4. List Scenarios ---');
    const listResp = await client.get('/proyeccion?codigo=8266', config);
    console.log('List Status:', listResp.status);
    if (listResp.data.proyecciones) {
        console.log('Saved Scenarios:', listResp.data.proyecciones.length);
        console.log('First Scenario Name:', listResp.data.proyecciones[0]?.name);
    }
}

verify();
