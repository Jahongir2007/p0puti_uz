import { fakeMetrics, fakeRabbit, queryChain } from '../../../test/support/fakes.js';
import { AdWorker } from './ad.service.js';

const db = vi.hoisted(() => ({ orm: { public: { Users: {} as any } } }));
vi.mock('../../prisma/db.js', () => ({ db }));

const ad = { role: 'driver', from: 'Toshkent', to: 'Samarqand', date: '2026-12-05', time: '09:00', calculatedArrivalTime: '13:00', userId: '5' };
const trip = { telegramId: '700000001', from: 'Toshkent', to: 'Samarqand', date: '2026-12-05', time: '09:00' };

async function startWorker(createResult: unknown) {
    db.orm.public.Users = queryChain({ first: { id: 5n, telegramId: 700000001n } });
    const rabbit = fakeRabbit();
    const adWrite = {
        create: vi.fn(async () => createResult),
        update: vi.fn(async () => ({ success: true })),
        cancel: vi.fn(async () => ({ success: true })),
    };
    await new AdWorker(rabbit as any, fakeMetrics() as any, adWrite as any).onModuleInit();
    return { handle: rabbit.handlers.ads, rabbit, adWrite };
}

const sentEvents = (rabbit: ReturnType<typeof fakeRabbit>) =>
    rabbit.published.filter((p) => p.queue === 'telegram_events').map((p) => p.data);

describe('AdWorker (AD_WRITE_MODE=async)', () => {
    it('saves a queued ad and tells the user through the bot', async () => {
        const { handle, rabbit, adWrite } = await startWorker({ success: true, adId: 42n });
        await handle({ type: 'POST_AD', data: ad });
        expect(adWrite.create).toHaveBeenCalledWith(ad);
        expect(sentEvents(rabbit)).toEqual([{ type: 'AD_CREATED', data: { ...trip, adId: '42' } }]);
    });

    it.each([
        ['AD_DUPLICATE', { type: 'AD_DUPLICATE', data: { ...trip, arrivalTime: '13:00' } }],
        ['AD_TOO_CLOSE', { type: 'AD_TOO_CLOSE', data: trip }],
        ['AD_IN_PAST', { type: 'AD_IN_PAST', data: trip }],
    ])('turns a %s refusal into the matching bot message', async (code, event) => {
        const { handle, rabbit } = await startWorker({ success: false, code, message: 'x' });
        await handle({ type: 'POST_AD', data: ad });
        expect(sentEvents(rabbit)).toEqual([event]);
    });

    it('sends no message for refusals the bot has no text for (a forged job with someone else\'s car)', async () => {
        const { handle, rabbit } = await startWorker({ success: false, code: 'VEHICLE_NOT_FOUND', message: 'x' });
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        await handle({ type: 'POST_AD', data: ad });
        expect(sentEvents(rabbit)).toEqual([]);
    });

    it('applies queued updates and cancellations through the same rules as the API', async () => {
        const { handle, adWrite } = await startWorker(null);
        await handle({ type: 'UPDATE_AD', data: { id: '42', userId: '5', price: 2, seats: 1, description: '' } });
        await handle({ type: 'DELETE_AD', data: { id: '42', userId: '5' } });
        expect(adWrite.update).toHaveBeenCalledWith(5n, 42n, expect.objectContaining({ price: 2, seats: 1 }));
        expect(adWrite.cancel).toHaveBeenCalledWith(5n, 42n);
    });

    it('logs a database error instead of crashing the worker', async () => {
        const { handle, adWrite } = await startWorker(null);
        adWrite.create.mockRejectedValue(new Error('db down'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(handle({ type: 'POST_AD', data: ad })).resolves.toBeUndefined();
    });
});
