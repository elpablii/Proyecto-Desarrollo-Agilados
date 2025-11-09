/**
 * @jest-environment node
 */
// Usamos 'node' en lugar de 'jsdom' porque solo probamos fetch, no el DOM.

import { jest } from '@jest/globals';

// 1. Mockear el módulo ANTES de importarlo usando unstable_mockModule
jest.unstable_mockModule('../authClient.js', () => ({
  authClient: {
    authenticatedFetch: jest.fn(),
  },
}));

// 2. Importaciones dinámicas (await import) para que usen el mock
const { fetchMalla, fetchAvance } = await import('../malla/mallaClient.js');
const { authClient } = await import('../authClient.js');
const { API_BASE_URL } = await import('../config.js');

// Datos de prueba (simulando la respuesta completa del backend)
const mockMallaResponse = { malla: [{ codigo: 'MCN-101', asignatura: 'CÁLCULO I', nivel: 1 }] };
const mockAvanceResponse = { avance: [{ course: 'MCN-101', status: 'APROBADO' }] };

describe('mallaClient', () => {
  beforeAll(() => {
    // Mock global de fetch si no existe en el entorno node
    if (!global.fetch) {
      global.fetch = jest.fn();
    } else {
      jest.spyOn(global, 'fetch');
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Asegurar que fetch sea un mock function antes de cada test
    if (!jest.isMockFunction(global.fetch)) {
        global.fetch = jest.fn();
    }
  });

  // Pruebas para fetchMalla (endpoint público)
  describe('fetchMalla', () => {
    it('debería obtener los datos de la malla correctamente', async () => {
      // Configuramos el mock de fetch para este test
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockMallaResponse, // Devuelve el objeto completo
      });

      const mallaId = '8266-202410';
      const data = await fetchMalla(mallaId);

      // Verificamos que fetch fue llamado con la URL correcta
      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/malla/${mallaId}`, { method: 'GET' });
      // Verificamos que los datos retornados son la propiedad .malla
      expect(data).toEqual(mockMallaResponse.malla);
    });

    it('debería lanzar un error si la respuesta del fetch no es ok', async () => {
      // Configuramos el mock de fetch para que falle
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'No Encontrado' }),
      });

      const mallaId = 'ID_INCORRECTO';
      
      // Verificamos que la promesa sea rechazada con el error correcto
      await expect(fetchMalla(mallaId)).rejects.toThrow('Error HTTP 404: No Encontrado');
    });
  });

  // Pruebas para fetchAvance (endpoint protegido)
  describe('fetchAvance', () => {
    it('debería obtener los datos de avance usando authenticatedFetch', async () => {
      // Configuramos el mock de authenticatedFetch
      authClient.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAvanceResponse, // Devuelve el objeto completo
      });

      const rut = '22.222.222-2';
      const codigoCarrera = '8266';
      const data = await fetchAvance(rut, codigoCarrera);

      // Verificamos que authenticatedFetch fue llamado con la URL correcta
      const expectedUrl = `${API_BASE_URL}/avance/${rut}/${codigoCarrera}`;
      expect(authClient.authenticatedFetch).toHaveBeenCalledWith(expectedUrl, { method: 'GET' });
      // Verificamos que los datos retornados son la propiedad .avance
      expect(data).toEqual(mockAvanceResponse.avance);
    });

    it('debería devolver un array vacío si el avance no se encuentra (404)', async () => {
      // Configuramos el mock de authenticatedFetch para que devuelva 404
      authClient.authenticatedFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Avance no encontrado' }),
      });

      const rut = 'RUT_VALIDO';
      const codigoCarrera = '8266';
      const data = await fetchAvance(rut, codigoCarrera);

      // No debe lanzar un error, debe devolver un array vacío
      expect(data).toEqual([]);
    });
  });

});