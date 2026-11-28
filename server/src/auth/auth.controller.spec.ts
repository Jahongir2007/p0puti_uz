import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
    it('passes initData from the body to the auth service', async () => {
        const auth = { authenticateTelegram: vi.fn(async () => ({ user: 'result' })) };
        const controller = new AuthController(auth as any);

        await expect(controller.authenticateTelegram('init-data')).resolves.toEqual({ user: 'result' });
        expect(auth.authenticateTelegram).toHaveBeenCalledWith('init-data');
    });
});
