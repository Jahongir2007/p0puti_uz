import { fakeMetrics, fakeRabbit } from '../../test/support/fakes.js';
import { AdService } from './ad.service.js';

vi.mock('../prisma/db.js', () => ({ db: {} })); // the write paths tested here don't read the database

const ad = { role: 'driver', from: 'A', to: 'B', date: '2026-12-05', time: '09:00', price: 1, seats: 1, note: '', vehicleId: 7, allowLuggage: true, calculatedArrivalTime: '13:00' } as any;

function setup(mode: 'sync' | 'async') {
    const rabbit = fakeRabbit();
    const adWrite = {
        create: vi.fn(async () => ({ success: true, adId: 42n })),
        check: vi.fn(async () => null),
        update: vi.fn(async () => ({ success: true })),
        cancel: vi.fn(async () => ({ success: true })),
    };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const service = new AdService(rabbit as any, fakeMetrics() as any, adWrite as any, { get: () => mode } as any);
    return { service, rabbit, adWrite };
}

describe('AdService in sync mode', () => {
    it('saves the ad right away and returns its id, without the queue', async () => {
        const { service, rabbit, adWrite } = setup('sync');
        await expect(service.postTelegramUserAd(ad, 5n)).resolves.toEqual({ success: true, queued: false, message: 'Ad posted', data: { id: '42' } });
        expect(adWrite.create).toHaveBeenCalledWith({ ...ad, userId: 5n });
        expect(rabbit.publish).not.toHaveBeenCalled();
    });

    it('passes a refusal through with its code', async () => {
        const { service, adWrite } = setup('sync');
        adWrite.create.mockResolvedValue({ success: false, code: 'AD_DUPLICATE', message: 'x' } as any);
        await expect(service.postTelegramUserAd(ad, 5n)).resolves.toMatchObject({ success: false, code: 'AD_DUPLICATE' });
    });

    it('updates and cancels directly', async () => {
        const { service, adWrite, rabbit } = setup('sync');
        await service.updateTelegramUserAdById(5n, 42n, { price: 2, seats: 1, description: '' });
        await service.deleteTelegramUserAdById(5n, 42n);
        expect(adWrite.update).toHaveBeenCalledWith(5n, 42n, { price: 2, seats: 1, description: '' });
        expect(adWrite.cancel).toHaveBeenCalledWith(5n, 42n);
        expect(rabbit.publish).not.toHaveBeenCalled();
    });

    it('answers "Something went wrong" instead of crashing on an unexpected error', async () => {
        const { service, adWrite } = setup('sync');
        adWrite.create.mockRejectedValue(new Error('db down'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(service.postTelegramUserAd(ad, 5n)).resolves.toEqual({ success: false, message: 'Something went wrong' });
    });
});

describe('AdService in async mode', () => {
    it('checks the ad, then queues it for the worker', async () => {
        const { service, rabbit, adWrite } = setup('async');
        await expect(service.postTelegramUserAd(ad, 5n)).resolves.toEqual({ success: true, queued: true, message: 'Ad queued' });
        expect(adWrite.check).toHaveBeenCalled();
        expect(adWrite.create).not.toHaveBeenCalled();
        expect(rabbit.published).toEqual([{ queue: 'ads', data: { type: 'POST_AD', data: { ...ad, userId: 5n } } }]);
    });

    it('refuses immediately and queues nothing when the check fails', async () => {
        const { service, rabbit, adWrite } = setup('async');
        adWrite.check.mockResolvedValue({ success: false, code: 'VEHICLE_NOT_FOUND', message: 'x' } as any);
        await expect(service.postTelegramUserAd(ad, 5n)).resolves.toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
        expect(rabbit.publish).not.toHaveBeenCalled();
    });

    it('queues updates and cancellations with the ad and user ids', async () => {
        const { service, rabbit } = setup('async');
        await service.updateTelegramUserAdById(5n, 42n, { price: 2, seats: 1, description: '' });
        await service.deleteTelegramUserAdById(5n, 42n);
        expect(rabbit.published).toEqual([
            { queue: 'ads', data: { type: 'UPDATE_AD', data: { price: 2, seats: 1, description: '', id: 42n, userId: 5n } } },
            { queue: 'ads', data: { type: 'DELETE_AD', data: { id: 42n, userId: 5n } } },
        ]);
    });
});

describe('AdService in both modes', () => {
    it('refuses a negative price before doing anything', async () => {
        for (const mode of ['sync', 'async'] as const) {
            const { service, rabbit, adWrite } = setup(mode);
            await expect(service.updateTelegramUserAdById(5n, 42n, { price: -1, seats: 1, description: '' }))
                .resolves.toEqual({ success: false, error: 'VALIDATION_ERROR' });
            expect(adWrite.update).not.toHaveBeenCalled();
            expect(rabbit.publish).not.toHaveBeenCalled();
        }
    });

    it('refuses to start with a wrong AD_WRITE_MODE', () => {
        expect(() => new AdService({} as any, fakeMetrics() as any, {} as any, { get: () => 'fast' } as any)).toThrow('AD_WRITE_MODE');
    });

    it('refuses a search time that is not HH:MM, before reading the database', async () => {
        const { service } = setup('sync');
        for (const time of ['25:00', '9:00', '09:60', 'noon']) {
            await expect(service.searchAds('A' as any, 'B' as any, '2026-12-05', 1, undefined, 10, undefined, time))
                .resolves.toEqual({ success: false, error: 'Invalid time, expected HH:MM' });
        }
    });
});
