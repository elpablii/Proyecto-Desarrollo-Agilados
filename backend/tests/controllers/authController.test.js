const authController = require('../../controllers/authController');
const authService = require('../../services/sessionService');

// Mock del servicio
jest.mock('../../services/sessionService');

describe('AuthController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            get: jest.fn(),
            ip: '127.0.0.1',
            connection: { remoteAddress: '127.0.0.1' },
            cookies: {},
            session: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            cookie: jest.fn(),
            clearCookie: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('handleLogin', () => {
        it('should login successfully and return token', async () => {
            req.body = { email: 'test@example.com', password: 'password' };
            const mockSession = {
                sessionId: 'sess-123',
                sessionData: { token: 'tok-123', expiresAt: Date.now() + 10000 },
                loginData: { rut: '11.111.111-1' }
            };
            authService.loginUser.mockResolvedValue(mockSession);

            await authController.handleLogin(req, res);

            expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'password', undefined);
            expect(res.cookie).toHaveBeenCalledWith('ucn_session', 'sess-123', expect.any(Object));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                rut: '11.111.111-1',
                token: 'tok-123'
            }));
        });

        it('should return 401 for invalid credentials', async () => {
            req.body = { email: 'wrong@example.com', password: 'wrong' };
            const error = new Error('Credenciales inválidas');
            error.detalle = 'User not found';
            authService.loginUser.mockRejectedValue(error);

            await authController.handleLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Credenciales inválidas', detalle: 'User not found' });
        });

        it('should return 500 for internal errors', async () => {
            req.body = { email: 'error@example.com', password: 'pass' };
            authService.loginUser.mockRejectedValue(new Error('Database error'));

            await authController.handleLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error interno del servidor al procesar el login' }));
        });
    });

    describe('handleLogout', () => {
        it('should clear cookie and call logout service', async () => {
            req.cookies.ucn_session = 'sess-123';

            await authController.handleLogout(req, res);

            expect(authService.logoutUser).toHaveBeenCalledWith('sess-123');
            expect(res.clearCookie).toHaveBeenCalledWith('ucn_session', { path: '/' });
            expect(res.json).toHaveBeenCalledWith({ message: 'Sesión cerrada exitosamente' });
        });
    });
});
