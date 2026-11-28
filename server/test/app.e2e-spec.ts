// End-to-end tests: the real Nest app (same setup as main.ts), a real PostgreSQL test database
// and a real RabbitMQ, called over HTTP like the mini app does. Runs in AD_WRITE_MODE=sync.
//
//   TEST_DATABASE_URL=postgresql://user:pw@localhost:5432/p0puti_test npm run test:e2e
//
// The test database is migrated automatically and must NOT be your dev database:
// these tests create users, cars and ads in it. Every run uses new random IDs, so no cleanup.
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

const TEST_DB = process.env.TEST_DATABASE_URL;
const BOT_TOKEN = '123456789:E2E_TEST_TOKEN'; // only for this test app; logins below are signed with it
let app: INestApplication;
let http: () => request.Agent;

// ---------- helpers ----------

const runId = Math.floor(Math.random() * 1e6);
let nextTelegramId = 900_000_000 + runId * 100;
const newTelegramId = () => nextTelegramId++;
const plate = () => `01E${String(Math.floor(Math.random() * 1e5)).padStart(5, '0')}EE`;
// A different random future day per test, so ads from other tests or runs never overlap
const futureDay = () => {
    const days = 30 + Math.floor(Math.random() * 3000);
    return new Date(Date.now() + days * 86400000 + 5 * 3600000).toISOString().slice(0, 10);
};
const yesterday = () => new Date(Date.now() - 86400000 + 5 * 3600000).toISOString().slice(0, 10);

function initData(user: Record<string, unknown>, authDate = Math.floor(Date.now() / 1000)) {
    const fields = { auth_date: String(authDate), user: JSON.stringify(user) };
    const check = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secret).update(check).digest('hex');
    return new URLSearchParams({ ...fields, hash }).toString();
}

async function login(telegramId = newTelegramId()) {
    const res = await http().post('/api/auth/telegram').send({ initData: initData({ id: telegramId, first_name: 'E2E' }) }).expect(201);
    const token: string = res.body.user.data.accessToken;
    return { token, auth: { Authorization: `Bearer ${token}` }, userId: res.body.user.data.user.id as string };
}

async function addCar(auth: Record<string, string>) {
    const res = await http().post('/api/vehicle').set(auth).send({ brand: 'Chevrolet', model: 'Cobalt', color: 'oq', plateNumber: plate() }).expect(201);
    return res.body.id as string;
}

const driverAd = (vehicleId: string, date = futureDay(), extra = {}) => ({
    role: 'driver', from: 'Toshkent', to: 'Samarqand', date, time: '09:00', price: 150000, seats: 3, note: 'e2e',
    vehicleId: Number(vehicleId), allowLuggage: true, calculatedArrivalTime: '13:00', ...extra,
});
const passengerAd = (date = futureDay(), extra = {}) => ({
    role: 'passenger', from: 'Toshkent', to: 'Samarqand', date, time: '18:00', price: 100000, seats: 1, note: '', ...extra,
});

// ---------- app ----------

beforeAll(async () => {
    if (!TEST_DB) {
        throw new Error('Set TEST_DATABASE_URL to a separate, empty PostgreSQL database (see the top of test/app.e2e-spec.ts).');
    }
    const devDb = dotenv.config({ quiet: true, processEnv: {} }).parsed?.DATABASE_URL;
    if (devDb && devDb === TEST_DB) {
        throw new Error('TEST_DATABASE_URL is the same database as DATABASE_URL in .env. Use a separate test database.');
    }

    // The test app's environment. Set before the app is imported: prisma/db.ts reads DATABASE_URL on import.
    Object.assign(process.env, {
        DATABASE_URL: TEST_DB,
        TELEGRAM_BOT_TOKEN: BOT_TOKEN,
        JWT_SECRET: 'e2e-secret-'.padEnd(40, 'x'),
        MINI_APP_URL: 'https://e2e.test',
        ALLOWED_ORIGINS: 'https://e2e.test',
        AD_WRITE_MODE: 'sync',
        RABBITMQ_URL: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
    });

    // Create or update the tables from the committed migrations (only touches the test database)
    execSync(`npx prisma db migrate --db "${TEST_DB}"`, { stdio: 'ignore' });

    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/app.setup.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    http = () => request(app.getHttpServer()) as unknown as request.Agent;
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
    await app?.close();
});

// ---------- tests ----------

describe('health and CORS', () => {
    it('GET /api answers', async () => {
        await http().get('/api').expect(200, 'Hello World!');
    });

    it('allows the mini app\'s origin and not others', async () => {
        const ok = await http().options('/api/ad/latest').set('Origin', 'https://e2e.test').set('Access-Control-Request-Method', 'GET');
        expect(ok.headers['access-control-allow-origin']).toBe('https://e2e.test');
        const evil = await http().options('/api/ad/latest').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
        expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    });
});

describe('login', () => {
    it('creates the user on first login and returns a token', async () => {
        const id = newTelegramId();
        const res = await http().post('/api/auth/telegram').send({ initData: initData({ id, first_name: 'Ali' }) }).expect(201);
        expect(res.body.user.data.user).toMatchObject({ telegramId: String(id), firstName: 'Ali' });
        expect(res.body.user.data.accessToken).toEqual(expect.any(String));
    });

    it('finds the same user on the next login', async () => {
        const id = newTelegramId();
        const first = await login(id);
        const second = await login(id);
        expect(second.userId).toBe(first.userId);
    });

    it('refuses forged and expired login data', async () => {
        const forged = initData({ id: newTelegramId(), first_name: 'X' }).replace(/hash=[0-9a-f]+/, 'hash=' + '0'.repeat(64));
        await http().post('/api/auth/telegram').send({ initData: forged }).expect(401);
        const old = initData({ id: newTelegramId(), first_name: 'X' }, Math.floor(Date.now() / 1000) - 2 * 86400);
        const res = await http().post('/api/auth/telegram').send({ initData: old }).expect(401);
        expect(res.body.message).toBe('Telegram initData has expired');
    });

    it('protects the API: no token or a fake token gets 401', async () => {
        await http().get('/api/vehicle').expect(401);
        await http().get('/api/vehicle').set('Authorization', 'Bearer fake').expect(401);
    });
});

describe('vehicles', () => {
    it('add, list, update and delete your own car', async () => {
        const { auth } = await login();
        const id = await addCar(auth);
        expect((await http().get('/api/vehicle').set(auth).expect(200)).body.map((v: any) => v.id)).toContain(id);

        const newPlate = plate();
        const upd = await http().patch(`/api/vehicle/${id}`).set(auth).send({ brand: 'Chevrolet', model: 'Gentra', color: 'qora', plateNumber: newPlate }).expect(200);
        expect(upd.body).toMatchObject({ success: true, data: { model: 'Gentra', plateNumber: newPlate } });

        await http().delete(`/api/vehicle/${id}`).set(auth).expect(200);
        expect((await http().get('/api/vehicle').set(auth).expect(200)).body.map((v: any) => v.id)).not.toContain(id);
    });

    it('PLATE_TAKEN for a plate another active car has; free again after that car is deleted', async () => {
        const a = await login();
        const b = await login();
        const taken = plate();
        const carA = (await http().post('/api/vehicle').set(a.auth).send({ brand: 'A', model: 'A', color: 'A', plateNumber: taken }).expect(201)).body.id;

        const dup = await http().post('/api/vehicle').set(b.auth).send({ brand: 'B', model: 'B', color: 'B', plateNumber: taken });
        expect(dup.body).toMatchObject({ success: false, code: 'PLATE_TAKEN' });

        const carB = await addCar(b.auth);
        const rename = await http().patch(`/api/vehicle/${carB}`).set(b.auth).send({ brand: 'B', model: 'B', color: 'B', plateNumber: taken });
        expect(rename.body).toMatchObject({ success: false, code: 'PLATE_TAKEN' });

        await http().delete(`/api/vehicle/${carA}`).set(a.auth).expect(200);
        expect((await http().post('/api/vehicle').set(b.auth).send({ brand: 'B', model: 'B', color: 'B', plateNumber: taken }).expect(201)).body.id).toEqual(expect.any(String));
    });

    it('two requests for the same new plate at once: exactly one wins', async () => {
        const { auth } = await login();
        const p = plate();
        const results = await Promise.all([1, 2].map(() => http().post('/api/vehicle').set(auth).send({ brand: 'C', model: 'C', color: 'C', plateNumber: p })));
        expect(results.filter((r) => r.body.id).length).toBe(1);
        expect(results.filter((r) => r.body.code === 'PLATE_TAKEN').length).toBe(1);
    });

    it('you cannot change or delete someone else\'s car', async () => {
        const owner = await login();
        const other = await login();
        const car = await addCar(owner.auth);
        expect((await http().patch(`/api/vehicle/${car}`).set(other.auth).send({ brand: 'X', model: 'X', color: 'X', plateNumber: plate() })).body.success).toBe(false);
        expect((await http().delete(`/api/vehicle/${car}`).set(other.auth)).body.success).toBe(false);
    });

    it('refuses an incomplete car with 400', async () => {
        const { auth } = await login();
        await http().post('/api/vehicle').set(auth).send({ brand: '' }).expect(400);
    });
});

describe('posting ads (sync mode)', () => {
    it('posts driver and passenger ads and returns their ids', async () => {
        const { auth } = await login();
        const car = await addCar(auth);
        const day = futureDay();
        const d = await http().post('/api/ad').set(auth).send(driverAd(car, day)).expect(201);
        expect(d.body).toMatchObject({ success: true, queued: false, data: { id: expect.any(String) } });
        const p = await http().post('/api/ad').set(auth).send(passengerAd(day)).expect(201);
        expect(p.body).toMatchObject({ success: true, queued: false });
    });

    it.each([
        ['missing driver fields', (car: string) => ({ ...driverAd(car), vehicleId: undefined }), 'INVALID_INPUT'],
        ['a past date', (car: string) => driverAd(car, yesterday()), 'AD_IN_PAST'],
    ])('refuses %s with its code', async (_name, body, code) => {
        const { auth } = await login();
        const car = await addCar(auth);
        expect((await http().post('/api/ad').set(auth).send(body(car)).expect(201)).body).toMatchObject({ success: false, code });
    });

    it('VEHICLE_NOT_FOUND for someone else\'s car', async () => {
        const owner = await login();
        const thief = await login();
        const car = await addCar(owner.auth);
        const res = await http().post('/api/ad').set(thief.auth).send(driverAd(car)).expect(201);
        expect(res.body).toMatchObject({ success: false, code: 'VEHICLE_NOT_FOUND' });
    });

    it('AD_DUPLICATE for an overlapping driver ad; AD_TOO_CLOSE for passenger ads within an hour', async () => {
        const { auth } = await login();
        const car = await addCar(auth);
        const day = futureDay();
        await http().post('/api/ad').set(auth).send(driverAd(car, day)).expect(201);
        expect((await http().post('/api/ad').set(auth).send(driverAd(car, day, { time: '11:00', calculatedArrivalTime: '15:00' }))).body.code).toBe('AD_DUPLICATE');

        const pday = futureDay();
        await http().post('/api/ad').set(auth).send(passengerAd(pday, { time: '18:00' })).expect(201);
        expect((await http().post('/api/ad').set(auth).send(passengerAd(pday, { time: '18:30' }))).body.code).toBe('AD_TOO_CLOSE');
    });

    it('a double tap creates one ad, not two', async () => {
        const { auth } = await login();
        const car = await addCar(auth);
        const body = driverAd(car);
        const results = await Promise.all([1, 2].map(() => http().post('/api/ad').set(auth).send(body)));
        expect(results.map((r) => r.body.success).sort()).toEqual([false, true]);
        expect(results.find((r) => !r.body.success)?.body.code).toBe('AD_DUPLICATE');
    });

    it('refuses bad input with 400 naming the field', async () => {
        const { auth } = await login();
        const car = await addCar(auth);
        const res = await http().post('/api/ad').set(auth).send(driverAd(car, futureDay(), { seats: 9, time: '25:00', note: 'x'.repeat(1001) })).expect(400);
        expect(res.body.message.map((e: any) => e.property).sort()).toEqual(['note', 'seats', 'time']);
    });
});

describe('reading, updating and cancelling ads', () => {
    async function userWithAd() {
        const user = await login();
        const car = await addCar(user.auth);
        const day = futureDay();
        const id = (await http().post('/api/ad').set(user.auth).send(driverAd(car, day)).expect(201)).body.data.id as string;
        return { ...user, car, day, id };
    }

    it('shows a new ad in my ads, the latest feed, search and its own page', async () => {
        const { auth, id, day } = await userWithAd();
        expect((await http().get('/api/ad/user?limit=50').set(auth)).body.data.map((a: any) => a.id)).toContain(id);
        const page = await http().get(`/api/ad/${id}`).set(auth).expect(200);
        expect(page.body.data.ad).toMatchObject({ id, type: 'DRIVER', user: { firstName: 'E2E' } });
        const found = await http().get(`/api/ad/search?from=Toshkent&to=Samarqand&date=${day}&limit=50`).set(auth);
        expect(found.body.data.map((a: any) => a.id)).toContain(id);
    });

    it('search filters by type and by free seats', async () => {
        const { auth, id, day } = await userWithAd(); // driver ad, 3 seats
        const q = `/api/ad/search?from=Toshkent&to=Samarqand&date=${day}&limit=50`;
        expect((await http().get(q + '&type=DRIVER').set(auth)).body.data.map((a: any) => a.id)).toContain(id);
        expect((await http().get(q + '&type=PASSENGER').set(auth)).body.data.map((a: any) => a.id)).not.toContain(id);
        expect((await http().get(q + '&passenger=3').set(auth)).body.data.map((a: any) => a.id)).toContain(id);
        expect((await http().get(q + '&passenger=4').set(auth)).body.data.map((a: any) => a.id)).not.toContain(id);
    });

    it('search can start from a time of day', async () => {
        const { auth, id, day } = await userWithAd(); // leaves at 09:00
        const q = `/api/ad/search?from=Toshkent&to=Samarqand&date=${day}&limit=50`;
        const ids = async (time: string) => (await http().get(`${q}&time=${time}`).set(auth)).body.data.map((a: any) => a.id);
        expect(await ids('08:00')).toContain(id);
        expect(await ids('09:00')).toContain(id); // leaving exactly then counts
        expect(await ids('09:01')).not.toContain(id);
        expect(await ids('23:00')).not.toContain(id);
        expect((await http().get(`${q}&time=25:00`).set(auth)).body).toEqual({ success: false, error: 'Invalid time, expected HH:MM' });
    });

    it('updates your own ad', async () => {
        const { auth, id } = await userWithAd();
        expect((await http().patch(`/api/ad/${id}`).set(auth).send({ price: 160000, seats: 2, description: 'updated' })).body).toEqual({ success: true });
        expect((await http().get(`/api/ad/${id}`).set(auth)).body.data.ad).toMatchObject({ price: 160000, seats: 2, description: 'updated' });
    });

    it('you cannot update or cancel someone else\'s ad', async () => {
        const { id } = await userWithAd();
        const other = await login();
        expect((await http().patch(`/api/ad/${id}`).set(other.auth).send({ price: 1, seats: 1 })).body).toMatchObject({ success: false, code: 'AD_NOT_FOUND' });
        expect((await http().delete(`/api/ad/${id}`).set(other.auth)).body).toMatchObject({ success: false, code: 'AD_NOT_FOUND' });
    });

    it('a cancelled ad leaves my ads and the feed, and the same trip can be posted again', async () => {
        const { auth, id, car, day } = await userWithAd();
        expect((await http().delete(`/api/ad/${id}`).set(auth)).body).toEqual({ success: true });
        expect((await http().get('/api/ad/user?limit=50').set(auth)).body.data.map((a: any) => a.id)).not.toContain(id);
        expect((await http().get('/api/ad/latest?limit=50').set(auth)).body.data.map((a: any) => a.id)).not.toContain(id);
        expect((await http().get(`/api/ad/${id}`).set(auth)).body.data.ad.status).toBe('CANCELLED');
        expect((await http().post('/api/ad').set(auth).send(driverAd(car, day))).body).toMatchObject({ success: true });
    });
});
