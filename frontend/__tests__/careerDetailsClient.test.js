/** @jest-environment jsdom */
import { jest } from '@jest/globals';

let CareerDetailsClient;

beforeAll(async () => {
    // import dinámico para evitar problemas con distintos modos (CJS/ESM)
    ({ default: CareerDetailsClient } = await import('../careerDetailsClient.js'));
});

beforeEach(() => {
    // limpiar DOM y mocks antes de cada test
    document.body.innerHTML = '<div id="career-details-container"></div>';
    global.fetch = jest.fn();
});

afterEach(() => {
    jest.resetAllMocks();
});

test('fetchCareerData devuelve datos parseados en respuesta OK', async () => {
    const sampleResponse = {
        rut: '1-9',
        carreras: [{ codigo: 'C1', nombre: 'Ingeniería', catalogo: '2025' }],
        meta: { source: 'api', fetchedAt: '2025-10-20T00:00:00Z' }
    };

    global.fetch.mockResolvedValue({
        ok: true,
        json: async () => sampleResponse
    });

    const client = new CareerDetailsClient();
    client.userId = 'user-123';

    const data = await client.fetchCareerData();

    expect(data).toBeDefined();
    expect(data.rut).toBe('1-9');
    expect(Array.isArray(data.carreras)).toBe(true);
    // si la implementación guarda los datos internamente
    if (typeof client.getCurrentCareerData === 'function') {
        expect(client.getCurrentCareerData()).toBe(data);
    }
});

test('fetchCareerData rechaza en respuesta no OK (error de API)', async () => {
    global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
    });

    const client = new CareerDetailsClient();
    client.userId = 'user-123';

    await expect(client.fetchCareerData()).rejects.toThrow();
});

test('fetchCareerData rechaza en error de red (fetch rechaza)', async () => {
    global.fetch.mockRejectedValue(new Error('network failure'));

    const client = new CareerDetailsClient();
    client.userId = 'user-123';

    await expect(client.fetchCareerData()).rejects.toThrow('network failure');
});

test('renderCareerDetails inserta información del usuario y al menos una carrera', () => {
    const sampleData = {
        rut: '1-9',
        carreras: [{ codigo: 'C1', nombre: 'Ingeniería en Pruebas', catalogo: '2025' }],
        meta: { source: 'api', fetchedAt: '2025-10-20T00:00:00Z' }
    };

    const client = new CareerDetailsClient();
    client.renderCareerDetails(sampleData, 'career-details-container');

    const container = document.getElementById('career-details-container');
    expect(container).not.toBeNull();
    // Contiene el bloque de información del estudiante
    expect(container.textContent).toMatch(/Información del Estudiante|RUT/i);
    // Contiene el nombre de la carrera renderizada
    expect(container.textContent).toMatch(/Ingeniería en Pruebas|Ingeniería/i);
});