import { fakeMetrics } from '../../test/support/fakes.js';
import { AdController } from './ad.controller.js';
import { AdType } from './enum/adType.enum.js';

vi.mock('../prisma/db.js', () => ({ db: {} }));

function setup() {
    const ads = {
        postTelegramUserAd: vi.fn(async () => ({ success: true })),
        getLatestAdsForTelegramUser: vi.fn(async () => ({ success: true })),
        searchAds: vi.fn(async () => ({ success: true })),
        getTelegramUserAds: vi.fn(async () => ({ success: true })),
        getAdByIdForTelegramUser: vi.fn(async () => ({ success: true })),
        updateTelegramUserAdById: vi.fn(async () => ({ success: true })),
        deleteTelegramUserAdById: vi.fn(async () => ({ success: true })),
    };
    return { ads, controller: new AdController(ads as any, fakeMetrics() as any) };
}
const req = { user: { sub: '5', telegramId: '700000001' } } as any;

describe('AdController', () => {
    it('posts an ad as the logged-in user (never a user id from the body)', async () => {
        const { ads, controller } = setup();
        await controller.postTelegramUserAd(req, { role: 'driver' } as any);
        expect(ads.postTelegramUserAd).toHaveBeenCalledWith({ role: 'driver' }, '5');
    });

    it('passes every search filter on, including type', async () => {
        const { ads, controller } = setup();
        await controller.searchAds('Toshkent' as any, 'Samarqand' as any, '2026-12-05', 'c1', 2, 20, AdType.DRIVER);
        expect(ads.searchAds).toHaveBeenCalledWith('Toshkent', 'Samarqand', '2026-12-05', 2, 'c1', 20, 'DRIVER');
    });

    it('lists only the logged-in user\'s ads', async () => {
        const { ads, controller } = setup();
        await controller.getTelegramUserAds(req, undefined, '10');
        expect(ads.getTelegramUserAds).toHaveBeenCalledWith(5n, undefined, 10);
    });

    it('updates and deletes ads as the logged-in user', async () => {
        const { ads, controller } = setup();
        await controller.updateTelegramUserAdById(req, '42', { price: 1, seats: 1 } as any);
        await controller.deleteTelegramUserAdById(req, '42');
        expect(ads.updateTelegramUserAdById).toHaveBeenCalledWith(5n, 42n, { price: 1, seats: 1 });
        expect(ads.deleteTelegramUserAdById).toHaveBeenCalledWith(5n, 42n);
    });

    it('uses 10 as the default page size of the latest feed', async () => {
        const { ads, controller } = setup();
        await controller.getLatestAdsForTelegramUser(undefined, undefined);
        expect(ads.getLatestAdsForTelegramUser).toHaveBeenCalledWith(undefined, 10);
    });
});
