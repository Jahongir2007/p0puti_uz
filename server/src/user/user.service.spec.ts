import { JwtService } from '@nestjs/jwt';
import '../app.setup.js'; // the BigInt → JSON patch the app applies at startup (user ids are BigInt)
import { fakeRabbit } from '../../test/support/fakes.js';
import { UserService } from './user.service.js';

const db = vi.hoisted(() => ({ orm: { public: { Users: { first: vi.fn(), create: vi.fn() } } } }));
vi.mock('../prisma/db.js', () => ({ db }));

const jwt = new JwtService({ secret: 's'.repeat(32), signOptions: { expiresIn: '1d' } });
const telegramUser = { id: 700000001, firstName: 'Ali', lastName: undefined, username: 'ali', photoUrl: undefined } as any;
const savedUser = { id: 5n, telegramId: 700000001n, firstName: 'Ali' };

describe('UserService.createOrFindUserFromTelegram', () => {
    beforeEach(() => vi.clearAllMocks());

    it('creates a new user, queues the welcome message and returns a 1-day token', async () => {
        db.orm.public.Users.first.mockResolvedValue(null);
        db.orm.public.Users.create.mockResolvedValue(savedUser);
        const rabbit = fakeRabbit();

        const result = await new UserService(rabbit as any, jwt).createOrFindUserFromTelegram(telegramUser);

        expect(db.orm.public.Users.first).toHaveBeenCalledWith({ telegramId: 700000001n });
        expect(db.orm.public.Users.create).toHaveBeenCalledWith(expect.objectContaining({ telegramId: 700000001n, firstName: 'Ali' }));
        expect(rabbit.published).toContainEqual({ queue: 'telegram_events', data: { type: 'USER_CREATED', data: { telegramId: '700000001' } } });

        const payload = jwt.verify(result.data.accessToken);
        expect(payload).toMatchObject({ sub: '5', telegramId: '700000001' });
        expect(payload.exp - payload.iat).toBe(24 * 3600);
        expect(result.data.user).toBe(savedUser);
    });

    it('finds an existing user by Telegram ID and sends no second welcome message', async () => {
        db.orm.public.Users.first.mockResolvedValue(savedUser);
        const rabbit = fakeRabbit();

        await new UserService(rabbit as any, jwt).createOrFindUserFromTelegram(telegramUser);

        expect(db.orm.public.Users.create).not.toHaveBeenCalled();
        expect(rabbit.published.map((p) => p.data.type)).toEqual(['UPDATE_USER']);
    });

    it('queues a profile sync with the current Telegram details on every login', async () => {
        db.orm.public.Users.first.mockResolvedValue(savedUser);
        const rabbit = fakeRabbit();

        await new UserService(rabbit as any, jwt).createOrFindUserFromTelegram(telegramUser);

        expect(rabbit.published).toContainEqual({
            queue: 'users',
            data: { type: 'UPDATE_USER', data: { telegramId: '700000001', firstName: 'Ali', lastName: undefined, username: 'ali', photoUrl: undefined } },
        });
    });

    it('still logs the user in when RabbitMQ is down', async () => {
        db.orm.public.Users.first.mockResolvedValue(null);
        db.orm.public.Users.create.mockResolvedValue(savedUser);
        const rabbit = { publish: vi.fn(async () => { throw new Error('Channel closed'); }) };
        const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await new UserService(rabbit as any, jwt).createOrFindUserFromTelegram(telegramUser);

        expect(result.success).toBe(true);
        expect(result.data.accessToken).toEqual(expect.any(String));
        // Both failures were caught and logged. Without `await` before publish, the error would
        // escape the try/catch and crash the API instead (that bug happened once).
        expect(logged).toHaveBeenCalledWith('Welcome message not queued:', expect.any(Error));
        expect(logged).toHaveBeenCalledWith('Profile sync not queued:', expect.any(Error));
    });
});
