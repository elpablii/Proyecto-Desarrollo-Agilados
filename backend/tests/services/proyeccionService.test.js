const proyeccionService = require('../../services/proyeccionService');
const proyeccionRepository = require('../../repositories/proyeccionRepository');

jest.mock('../../repositories/proyeccionRepository');

describe('ProyeccionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveProjection', () => {
        it('should save a projection and return it', async () => {
            const input = {
                userId: 'user-1',
                codigoCarrera: 'C1',
                name: 'My Plan',
                projection: { data: 'test' }
            };

            proyeccionRepository.save.mockImplementation(async (obj) => obj);

            const result = await proyeccionService.saveProjection(input);

            expect(result).toHaveProperty('id');
            expect(result.userId).toBe('user-1');
            expect(result.name).toBe('My Plan');
            expect(proyeccionRepository.save).toHaveBeenCalled();
        });
    });

    describe('deleteProjection', () => {
        it('should delete projection by id', async () => {
            proyeccionRepository.deleteById.mockResolvedValue(true);

            const result = await proyeccionService.deleteProjection('proj-1');

            expect(result).toBe(true);
            expect(proyeccionRepository.deleteById).toHaveBeenCalledWith('proj-1');
        });
    });
});
