const proxyService = require('../../services/proxyService');
const axios = require('axios');
const helpers = require('../../utils/helpers');

// Fetch nativo disponible en Node 20
global.fetch = jest.fn();

jest.mock('axios');
jest.mock('../../utils/helpers');

describe('ProxyService', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV, HAWAII_AUTH: 'test-token' };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    describe('fetchMalla', () => {
        it('should fetch data from external API successfully', async () => {
            const mockData = { malla: ['item1'] };
            axios.get.mockResolvedValue({ status: 200, data: mockData });

            const result = await proxyService.fetchMalla('C01', '2023');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('C01-2023'),
                expect.objectContaining({ headers: { 'X-HAWAII-AUTH': 'test-token' } })
            );
            expect(result.data).toEqual(['item1']);
            expect(result.meta.source).toBe('external');
        });

        it('should throw error if HAWAII_AUTH is missing', async () => {
            delete process.env.HAWAII_AUTH;

            await expect(proxyService.fetchMalla('C01', '2023'))
                .rejects
                .toThrow('Servicio externo deshabilitado');
        });

        it('should use local fallback if external API fails (with response)', async () => {
            axios.get.mockRejectedValue({
                response: { status: 502, data: { error: 'Bad Gateway' } }
            });

            helpers.getLocalMallaFallback.mockReturnValue({
                malla: ['fallback-data'],
                source: 'test-fallback'
            });

            const result = await proxyService.fetchMalla('C01', '2023');

            expect(result.data).toEqual(['fallback-data']);
            expect(result.meta.source).toBe('test-fallback');
        });

        it('should use local fallback if external API fails (exception)', async () => {
            axios.get.mockRejectedValue(new Error('Network Error'));

            helpers.getLocalMallaFallback.mockReturnValue({
                malla: ['fallback-data'],
                source: 'test-fallback'
            });

            const result = await proxyService.fetchMalla('C01', '2023');

            expect(result.data).toEqual(['fallback-data']);
            expect(result.meta.source).toBe('test-fallback');
        });

        it('should throw error if external API fails and no fallback available', async () => {
            axios.get.mockRejectedValue({
                response: { status: 500, data: { error: 'Fatal' } }
            });

            helpers.getLocalMallaFallback.mockReturnValue(null);

            await expect(proxyService.fetchMalla('C01', '2023'))
                .rejects
                .toThrow('Error al obtener malla');
        });
    });

    describe('fetchAvance', () => {
        it('should fetch avance successfully', async () => {
            const mockResponse = {
                ok: true,
                headers: { get: () => 'application/json' },
                json: jest.fn().mockResolvedValue({ some: 'data' })
            };
            global.fetch.mockResolvedValue(mockResponse);

            const result = await proxyService.fetchAvance('12345678-9', 'C01');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('12345678-9'),
                expect.objectContaining({ method: 'GET' })
            );
            expect(result.data).toEqual({ some: 'data' });
        });

        it('should throw 404 if student not found', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                json: jest.fn().mockResolvedValue({ error: 'Alumno no encontrado' })
            };
            global.fetch.mockResolvedValue(mockResponse);

            await expect(proxyService.fetchAvance('12345678-9', 'C01'))
                .rejects
                .toMatchObject({ status: 404 });
        });

        it('should throw error on non-JSON response', async () => {
            const mockResponse = {
                ok: true,
                headers: { get: () => 'text/html' },
            };
            global.fetch.mockResolvedValue(mockResponse);

            await expect(proxyService.fetchAvance('12345678-9', 'C01'))
                .rejects
                .toThrow('Respuesta inesperada');
        });
    });
});
