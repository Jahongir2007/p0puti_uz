import { fakeMetrics, fakeRabbit } from '../../../test/support/fakes.js';
import { queryChain } from '../../../test/support/fakes.js';
import { UserWorkerService } from './user.service.js';

const db = vi.hoisted(() => ({ orm: { public: { Users: {} as any } } }));
vi.mock('../../prisma/db.js', () => ({ db }));

const inDb = { firstName: 'Ali', lastName: null, username: 'ali', photoUrl: 'https://t.me/i/a.jpg' };

// Starts the worker and returns the handler it registered for the `users` queue
async function startWorker(stored: unknown) {
    const users = queryChain({ first: stored });
    db.orm.public.Users = users;
    const rabbit = fakeRabbit();
    await new UserWorkerService(rabbit as any, fakeMetrics() as any).onModuleInit();
    return { users, handle: rabbit.handlers.users };
}

const job = (data: object) => ({ type: 'UPDATE_USER', data: { telegramId: '700000001', ...data } });

describe('UserWorkerService', () => {
    it('listens on the `users` queue', async () => {
        const { handle } = await startWorker(inDb);
        expect(handle).toEqual(expect.any(Function));
    });

    it('finds the user by Telegram ID, which never changes', async () => {
        const { users, handle } = await startWorker(inDb);
        await handle(job({ firstName: 'Ali', username: 'ali', photoUrl: 'https://t.me/i/a.jpg' }));
        expect(users.where).toHaveBeenCalledWith({ telegramId: 700000001n });
    });

    it('updates the row when the Telegram profile changed', async () => {
        const { users, handle } = await startWorker(inDb);
        await handle(job({ firstName: 'Alisher', username: 'alisher_new', photoUrl: 'https://t.me/i/b.jpg' }));
        expect(users.update).toHaveBeenCalledWith({
            firstName: 'Alisher',
            lastName: null,
            username: 'alisher_new',
            photoUrl: 'https://t.me/i/b.jpg',
            updatedAt: expect.anything(),
        });
    });

    it('clears fields the user removed in Telegram (Telegram just leaves them out)', async () => {
        const { users, handle } = await startWorker({ ...inDb, lastName: 'Valiyev' });
        await handle(job({ firstName: 'Ali', username: 'ali', photoUrl: 'https://t.me/i/a.jpg' })); // no last_name sent
        expect(users.update).toHaveBeenCalledWith(expect.objectContaining({ lastName: null }));
    });

    it('does nothing when nothing changed, even though missing fields arrive as undefined', async () => {
        const { users, handle } = await startWorker(inDb);
        await handle(job({ firstName: 'Ali', username: 'ali', photoUrl: 'https://t.me/i/a.jpg' })); // lastName undefined vs null
        expect(users.update).not.toHaveBeenCalled();
    });

    it('does nothing for an unknown user', async () => {
        const { users, handle } = await startWorker(null);
        await handle(job({ firstName: 'Ghost' }));
        expect(users.update).not.toHaveBeenCalled();
    });

    it('logs a database error instead of crashing the worker', async () => {
        const { users, handle } = await startWorker(inDb);
        users.update.mockRejectedValue(new Error('db down'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await expect(handle(job({ firstName: 'Changed' }))).resolves.toBeUndefined();
    });
});
