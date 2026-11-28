import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
    const telegramUser = { id: 1, firstName: 'Ali' };

    it('checks the Telegram data, then finds or creates the user', async () => {
        const telegram = { validateInitData: vi.fn(() => telegramUser) };
        const users = { createOrFindUserFromTelegram: vi.fn(async () => ({ success: true, data: { accessToken: 't' } })) };
        const service = new AuthService(telegram as any, users as any);

        const result = await service.authenticateTelegram('init-data');

        expect(telegram.validateInitData).toHaveBeenCalledWith('init-data');
        expect(users.createOrFindUserFromTelegram).toHaveBeenCalledWith(telegramUser);
        expect(result).toEqual({ user: { success: true, data: { accessToken: 't' } } });
    });

    it('never touches the database when the Telegram data is invalid', async () => {
        const telegram = { validateInitData: vi.fn(() => { throw new UnauthorizedException('Invalid Telegram initData'); }) };
        const users = { createOrFindUserFromTelegram: vi.fn() };
        const service = new AuthService(telegram as any, users as any);

        await expect(service.authenticateTelegram('forged')).rejects.toThrow('Invalid Telegram initData');
        expect(users.createOrFindUserFromTelegram).not.toHaveBeenCalled();
    });
});
