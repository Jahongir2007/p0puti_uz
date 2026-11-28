import { VehicleController } from './vehicle.controller.js';

vi.mock('../prisma/db.js', () => ({ db: {} }));

describe('VehicleController', () => {
    const vehicles = {
        getTelegramUserVehiclesByUserId: vi.fn(async () => []),
        createTelegramUserVehicle: vi.fn(async () => ({})),
        updateTelegramUserVehicle: vi.fn(async () => ({})),
        deleteTelegramUserVehicle: vi.fn(async () => ({})),
    };
    const controller = new VehicleController(vehicles as any);
    const req = { user: { sub: '5' } } as any;
    const car = { brand: 'A', model: 'B', color: 'C', plateNumber: 'D' } as any;

    it('always works on the logged-in user\'s cars', async () => {
        await controller.getTelegramUserVehicle(req);
        await controller.createTelegramUserVehicle(req, car);
        await controller.updateTelegramUserVehicle(req, '7', car);
        await controller.deleteTelegramUserVehicle(req, '7');

        expect(vehicles.getTelegramUserVehiclesByUserId).toHaveBeenCalledWith('5');
        expect(vehicles.createTelegramUserVehicle).toHaveBeenCalledWith(car, '5');
        expect(vehicles.updateTelegramUserVehicle).toHaveBeenCalledWith(car, '5', 7n);
        expect(vehicles.deleteTelegramUserVehicle).toHaveBeenCalledWith('5', 7n);
    });
});
