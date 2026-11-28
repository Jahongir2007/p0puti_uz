import { Temporal } from 'temporal-polyfill';
import { queryChain } from '../../test/support/fakes.js';
import { AdWriteService, readAdWriteMode } from './ad-write.service.js';

vi.mock('../prisma/db.js', () => ({ db: {} })); // check() gets its queries passed in; never load the real client

// A future day in Tashkent, so ads are never "in the past"
const futureDay = Temporal.Now.plainDateISO('Asia/Tashkent').add({ days: 30 }).toString();
const driverAd = {
    role: 'driver', from: 'Toshkent', to: 'Samarqand', date: futureDay, time: '09:00', price: 1, seats: 3, note: '',
    vehicleId: 7, allowLuggage: true, calculatedArrivalTime: '13:00', userId: '5',
} as any;
const passengerAd = { role: 'passenger', from: 'Toshkent', to: 'Samarqand', date: futureDay, time: '18:00', price: 1, seats: 1, note: '', userId: '5' } as any;

// A fake db/transaction whose Vehicles and Ads queries answer what the test wants
const fakeDb = ({ vehicle = { id: 7n } as unknown, otherAd = null as unknown } = {}) => {
    const vehicles = queryChain({ first: vehicle });
    const ads = queryChain({ first: otherAd });
    return { q: { orm: { public: { Vehicles: vehicles, Ads: ads } } } as any, vehicles, ads };
};

const service = new AdWriteService();

describe('readAdWriteMode', () => {
    const config = (value?: string) => ({ get: () => value }) as any;

    it('defaults to async, as before the variable existed', () => {
        expect(readAdWriteMode(config(undefined))).toBe('async');
    });

    it('accepts sync and async', () => {
        expect(readAdWriteMode(config('sync'))).toBe('sync');
        expect(readAdWriteMode(config('async'))).toBe('async');
    });

    it('refuses anything else instead of guessing', () => {
        expect(() => readAdWriteMode(config('Sync'))).toThrow('AD_WRITE_MODE must be "sync" or "async"');
    });
});

describe('AdWriteService.check', () => {
    it('accepts a valid driver ad with the user\'s own car and no overlap', async () => {
        const { q, vehicles } = fakeDb();
        await expect(service.check(driverAd, q)).resolves.toBeNull();
        expect(vehicles.where).toHaveBeenCalledWith({ id: 7n, userId: 5n, deletedAt: null });
    });

    it('INVALID_INPUT: a driver ad without car, luggage or arrival time', async () => {
        const { q } = fakeDb();
        for (const missing of ['vehicleId', 'allowLuggage', 'calculatedArrivalTime']) {
            const ad = { ...driverAd, [missing]: undefined };
            await expect(service.check(ad, q)).resolves.toMatchObject({ success: false, code: 'INVALID_INPUT' });
        }
    });

    it('INVALID_INPUT: a date or time that is not real', async () => {
        const { q } = fakeDb();
        await expect(service.check({ ...passengerAd, date: '2026-02-31' }, q)).resolves.toMatchObject({ code: 'INVALID_INPUT' });
        await expect(service.check({ ...passengerAd, time: 'ab:cd' }, q)).resolves.toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('AD_IN_PAST: for drivers and passengers, before touching the database', async () => {
        const yesterday = Temporal.Now.plainDateISO('Asia/Tashkent').subtract({ days: 1 }).toString();
        for (const ad of [driverAd, passengerAd]) {
            const { q, vehicles, ads } = fakeDb();
            await expect(service.check({ ...ad, date: yesterday }, q)).resolves.toMatchObject({ code: 'AD_IN_PAST' });
            expect(vehicles.first).not.toHaveBeenCalled();
            expect(ads.first).not.toHaveBeenCalled();
        }
    });

    it('VEHICLE_NOT_FOUND: the car is someone else\'s, deleted, or doesn\'t exist', async () => {
        const { q } = fakeDb({ vehicle: null });
        await expect(service.check(driverAd, q)).resolves.toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
    });

    it('AD_DUPLICATE: the driver already has an ACTIVE ad overlapping this trip', async () => {
        const { q, ads } = fakeDb({ otherAd: { id: 1n } });
        await expect(service.check(driverAd, q)).resolves.toMatchObject({ code: 'AD_DUPLICATE' });
        // only ACTIVE ads count, so a cancelled ad doesn't block posting the same trip again
        expect(ads.where).toHaveBeenCalledWith({ userId: 5n, status: 'ACTIVE' });
    });

    it('AD_TOO_CLOSE: a passenger already has an ACTIVE ad within an hour', async () => {
        const { q, ads } = fakeDb({ otherAd: { id: 1n } });
        await expect(service.check(passengerAd, q)).resolves.toMatchObject({ code: 'AD_TOO_CLOSE' });
        expect(ads.where).toHaveBeenCalledWith({ userId: 5n, status: 'ACTIVE' });
    });

    it('does not ask for a car on passenger ads', async () => {
        const { q, vehicles } = fakeDb();
        await expect(service.check(passengerAd, q)).resolves.toBeNull();
        expect(vehicles.first).not.toHaveBeenCalled();
    });
});
