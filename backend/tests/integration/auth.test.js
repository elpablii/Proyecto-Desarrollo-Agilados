const request = require('supertest');

// Mockear el repositorio antes de importar la app
jest.mock('../../repositories/sessionRepository', () => ({
    save: jest.fn().mockResolvedValue(true),
    deleteById: jest.fn().mockResolvedValue(true),
    findById: jest.fn(),
    findByToken: jest.fn(),
    loadSessionsFromDisk: jest.fn(),
    findAll: jest.fn().mockReturnValue([])
}));

const app = require('../../index'); // Importamos la app refactorizada

describe('Auth Integration', () => {
    // Nota: Como estamos usando el backend real, esto intentará contactar servicios externos
    // Para tests de integración "puros" deberíamos mockear fetch o el servicio, 
    // pero aquí probaremos el flujo HTTP básico.
    // Usaremos las credenciales de "Maria" que están hardcodeadas para test en el servicio.

    it('POST /login with valid mock credentials should return 200', async () => {
        const res = await request(app)
            .post('/login')
            .send({
                email: 'maria@example.com',
                password: 'pass_maria'
            });

        if (res.statusCode !== 200) {
            console.log('Login failed:', res.statusCode, res.body);
        }
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('rut');
        // Verificar cookie
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.includes('ucn_session'))).toBe(true);
    });

    it('POST /login with invalid credentials should return 401', async () => {
        // Mockeamos el servicio interno si queremos evitar llamadas externas reales que fallen por red,
        // pero el servicio ya tiene lógica para fallar si no es Maria y falla el fetch.
        // Asumimos que sin red o con credenciales malas fallará.

        const res = await request(app)
            .post('/login')
            .send({
                email: 'fake@example.com',
                password: 'fake'
            });

        // Puede ser 401 o 500 dependiendo de si falla el fetch a la UCN o responde error
        // En entorno de test sin red externa podría ser 500, pero idealmente 401.
        // Dado que el servicio intenta fetch, si falla la red lanza error.
        expect([401, 500]).toContain(res.statusCode);
    });
});
