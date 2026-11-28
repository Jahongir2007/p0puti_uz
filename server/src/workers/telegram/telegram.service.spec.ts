import { fakeMetrics, fakeRabbit } from '../../../test/support/fakes.js';
import { TelegramWorker } from './telegram.service.js';

const trip = { telegramId: '700000001', from: 'A', to: 'B', date: '2026-12-05', time: '09:00' };

async function startWorker() {
    const rabbit = fakeRabbit();
    const bot = {
        sendWelcomeMessage: vi.fn(async () => {}),
        sendAdCreatedMessage: vi.fn(async () => {}),
        sendAdDuplicateMessage: vi.fn(async () => {}),
        sendAdTooCloseMessage: vi.fn(async () => {}),
        sendAdInPastMessage: vi.fn(async () => {}),
    };
    await new TelegramWorker(rabbit as any, fakeMetrics() as any, bot as any).onModuleInit();
    return { handle: rabbit.handlers.telegram_events, bot };
}

describe('TelegramWorker', () => {
    it.each([
        ['USER_CREATED', { telegramId: '700000001' }, 'sendWelcomeMessage'],
        ['AD_CREATED', { ...trip, adId: '42' }, 'sendAdCreatedMessage'],
        ['AD_DUPLICATE', { ...trip, arrivalTime: '13:00' }, 'sendAdDuplicateMessage'],
        ['AD_TOO_CLOSE', trip, 'sendAdTooCloseMessage'],
        ['AD_IN_PAST', trip, 'sendAdInPastMessage'],
    ] as const)('sends %s with %s', async (type, data, method) => {
        const { handle, bot } = await startWorker();
        await handle({ type, data });
        expect(bot[method]).toHaveBeenCalledTimes(1);
        expect(bot[method].mock.calls[0][0]).toBe('700000001');
    });

    it('drops the message quietly when the user blocked the bot (retrying can never work)', async () => {
        const { handle, bot } = await startWorker();
        bot.sendAdCreatedMessage.mockRejectedValue(Object.assign(new Error('Forbidden'), { error_code: 403 }));
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        await expect(handle({ type: 'AD_CREATED', data: { ...trip, adId: '42' } })).resolves.toBeUndefined();
    });

    it('passes other Telegram errors on, so RabbitMQ handles the message', async () => {
        const { handle, bot } = await startWorker();
        bot.sendWelcomeMessage.mockRejectedValue(Object.assign(new Error('Too Many Requests'), { error_code: 429 }));
        await expect(handle({ type: 'USER_CREATED', data: { telegramId: '1' } })).rejects.toThrow('Too Many Requests');
    });

    it('ignores unknown message types instead of crashing', async () => {
        const { handle } = await startWorker();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        await expect(handle({ type: 'SOMETHING_NEW', data: { telegramId: '1' } })).resolves.toBeUndefined();
    });
});
