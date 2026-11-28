import { queryChain } from '../../test/support/fakes.js';
import { VehicleService } from './vehicle.service.js';

const db = vi.hoisted(() => ({
    orm: { public: { Vehicles: {} as any } },
    raw: { sql: () => ({ returnsRow: () => ({ build: () => 'lock-query' }) }) },
    transaction: vi.fn(),
}));
vi.mock('../prisma/db.js', () => ({ db }));

const car = { brand: 'Chevrolet', model: 'Cobalt', color: 'oq', plateNumber: '01A123BC' } as any;
const uniqueViolation = Object.assign(new Error('duplicate key value violates unique constraint'), { sqlState: '23505' });
const PLATE_TAKEN = { success: false, code: 'PLATE_TAKEN', data: { message: 'This plate number is already exists' } };

// Runs the service's transaction callback against a fake transaction
function transactionWith({ lockedRows = [{ id: 7n }], update = vi.fn(async () => ({ id: 7n, ...car })) } = {}) {
    const vehicles = queryChain();
    vehicles.update = update; // .where() returns this same object, so .where(...).update() reaches it
    const tx = { query: vi.fn(async () => lockedRows), orm: { public: { Vehicles: vehicles } } };
    db.transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    return tx;
}

const service = new VehicleService();
beforeEach(() => vi.clearAllMocks());

describe('VehicleService.createTelegramUserVehicle', () => {
    it('creates the car for the user', async () => {
        const chain = queryChain({ first: null, create: { id: 9n, ...car } });
        db.orm.public.Vehicles = chain;
        await expect(service.createTelegramUserVehicle(car, 5n)).resolves.toEqual({ id: 9n, ...car });
        expect(chain.create).toHaveBeenCalledWith({ ...car, userId: 5n });
    });

    it('PLATE_TAKEN when an active car already has the plate (not success: true like before)', async () => {
        const chain = queryChain({ first: { id: 3n } });
        db.orm.public.Vehicles = chain;
        await expect(service.createTelegramUserVehicle(car, 5n)).resolves.toEqual(PLATE_TAKEN);
        expect(chain.create).not.toHaveBeenCalled();
    });

    it('PLATE_TAKEN when two requests race and the unique index stops the second', async () => {
        const chain = queryChain({ first: null });
        chain.create.mockRejectedValue(uniqueViolation);
        db.orm.public.Vehicles = chain;
        await expect(service.createTelegramUserVehicle(car, 5n)).resolves.toEqual(PLATE_TAKEN);
    });

    it('lets other database errors through instead of hiding them', async () => {
        const chain = queryChain({ first: null });
        chain.create.mockRejectedValue(new Error('connection lost'));
        db.orm.public.Vehicles = chain;
        await expect(service.createTelegramUserVehicle(car, 5n)).rejects.toThrow('connection lost');
    });
});

describe('VehicleService.updateTelegramUserVehicle', () => {
    it('updates the user\'s own car', async () => {
        const tx = transactionWith();
        await expect(service.updateTelegramUserVehicle(car, 5n, 7n)).resolves.toEqual({ success: true, data: { id: 7n, ...car } });
        expect(tx.orm.public.Vehicles.update).toHaveBeenCalledWith(car);
    });

    it('refuses someone else\'s car (the lock query finds no row of this user)', async () => {
        const tx = transactionWith({ lockedRows: [] });
        await expect(service.updateTelegramUserVehicle(car, 5n, 7n)).resolves.toEqual({ success: false, data: { message: 'User vehicle is not found' } });
        expect(tx.orm.public.Vehicles.update).not.toHaveBeenCalled();
    });

    it('PLATE_TAKEN when renaming to a plate another active car has', async () => {
        transactionWith({ update: vi.fn(async () => { throw uniqueViolation; }) });
        await expect(service.updateTelegramUserVehicle(car, 5n, 7n)).resolves.toEqual(PLATE_TAKEN);
    });
});

describe('VehicleService.deleteTelegramUserVehicle', () => {
    it('soft-deletes the user\'s own car', async () => {
        const update = vi.fn(async () => ({ id: 7n }));
        transactionWith({ update });
        await expect(service.deleteTelegramUserVehicle(5n, 7n)).resolves.toMatchObject({ success: true });
        expect(update).toHaveBeenCalledWith({ deletedAt: expect.anything() });
    });

    it('refuses someone else\'s car', async () => {
        const update = vi.fn();
        transactionWith({ lockedRows: [], update });
        await expect(service.deleteTelegramUserVehicle(5n, 7n)).resolves.toMatchObject({ success: false });
        expect(update).not.toHaveBeenCalled();
    });
});
