import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PostAdDto } from './postAd.dto.js';
import { UpdateAdDto } from './updateAd.dto.js';

// Same as the global ValidationPipe: turn the body into the DTO, then validate
const invalidFields = (dto: any, body: object) =>
    validateSync(plainToInstance(dto, body), { whitelist: true }).map((e) => e.property);

const driverAd = {
    role: 'driver', from: 'Toshkent', to: 'Samarqand', date: '2026-12-05', time: '09:00',
    price: 150000, seats: 3, note: '', vehicleId: 7, allowLuggage: true, calculatedArrivalTime: '13:00',
};

describe('PostAdDto', () => {
    it('accepts a normal driver ad and a normal passenger ad', () => {
        expect(invalidFields(PostAdDto, driverAd)).toEqual([]);
        expect(invalidFields(PostAdDto, { role: 'passenger', from: 'A', to: 'B', date: '2026-12-05', time: '18:00', price: 1, seats: 1, note: '' })).toEqual([]);
    });

    it('accepts the edge values: price 0, 8 seats, 23:59, 1000-character note', () => {
        expect(invalidFields(PostAdDto, { ...driverAd, price: 0, seats: 8, time: '23:59', calculatedArrivalTime: '00:00', note: 'x'.repeat(1000) })).toEqual([]);
    });

    it.each([
        ['role', { role: 'pilot' }],
        ['from', { from: '' }],
        ['from', { from: 'x'.repeat(101) }],
        ['to', { to: '   ' }],
        ['date', { date: 'tomorrow' }],
        ['date', { date: '2026-13-01' }],
        ['date', { date: '2026-12-32' }],
        ['time', { time: '24:00' }],
        ['time', { time: '9:00' }],
        ['price', { price: -1 }],
        ['price', { price: 1.5 }],
        ['price', { price: 10_000_001 }],
        ['price', { price: '100' }],
        ['seats', { seats: 0 }],
        ['seats', { seats: 9 }],
        ['note', { note: 'x'.repeat(1001) }],
        ['vehicleId', { vehicleId: 0 }],
        ['calculatedArrivalTime', { calculatedArrivalTime: '7pm' }],
        ['estimatedDurationHours', { estimatedDurationHours: 49 }],
    ])('refuses a bad %s', (field, patch) => {
        expect(invalidFields(PostAdDto, { ...driverAd, ...patch })).toContain(field);
    });

    it('trims city names, so "  Toshkent " and "Toshkent" are the same city', () => {
        expect(plainToInstance(PostAdDto, { ...driverAd, from: '  Toshkent ' }).from).toBe('Toshkent');
    });
});

describe('UpdateAdDto', () => {
    it('accepts price, seats and an optional description', () => {
        expect(invalidFields(UpdateAdDto, { price: 1000, seats: 2 })).toEqual([]);
        expect(invalidFields(UpdateAdDto, { price: 0, seats: 8, description: 'ok' })).toEqual([]);
    });

    it.each([
        ['price', { price: 2.5, seats: 1 }],
        ['price', { price: -5, seats: 1 }],
        ['seats', { price: 1, seats: 0 }],
        ['seats', { price: 1, seats: 9 }],
        ['description', { price: 1, seats: 1, description: 'x'.repeat(1001) }],
    ])('refuses a bad %s', (field, body) => {
        expect(invalidFields(UpdateAdDto, body)).toContain(field);
    });
});
