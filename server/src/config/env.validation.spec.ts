import { parseOrigins, validateEnv } from './env.validation.js';

const valid = {
    DATABASE_URL: 'postgresql://user:pw@localhost:5432/p0puti',
    RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
    JWT_SECRET: 'x'.repeat(32),
    TELEGRAM_BOT_TOKEN: '123456789:AAE-test_token',
    MINI_APP_URL: 'https://p0puti.uz',
    ALLOWED_ORIGINS: 'https://p0puti.uz,http://localhost:5173',
};

const problems = (env: Record<string, unknown>) => {
    try {
        validateEnv(env);
        return '';
    } catch (err) {
        return (err as Error).message;
    }
};

describe('validateEnv', () => {
    it('accepts a complete environment and fills in the defaults', () => {
        const env = validateEnv(valid);
        expect(env.PORT).toBe(3000);
        expect(env.AD_WRITE_MODE).toBe('async');
    });

    it('turns PORT from text into a number', () => {
        expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
    });

    it('lists every missing variable at once', () => {
        const message = problems({});
        for (const name of ['DATABASE_URL', 'RABBITMQ_URL', 'JWT_SECRET', 'TELEGRAM_BOT_TOKEN', 'MINI_APP_URL', 'ALLOWED_ORIGINS']) {
            expect(message).toContain(name);
        }
    });

    it.each([
        ['DATABASE_URL', 'mysql://localhost/db'],
        ['RABBITMQ_URL', 'http://localhost:5672'],
        ['JWT_SECRET', 'too-short'],
        ['TELEGRAM_BOT_TOKEN', 'not a token'],
        ['MINI_APP_URL', 'http://p0puti.uz'],
        ['ALLOWED_ORIGINS', 'https://p0puti.uz/'],
        ['ALLOWED_ORIGINS', 'p0puti.uz'],
        ['AD_WRITE_MODE', 'Sync'],
        ['PORT', '99999'],
    ])('rejects a wrong %s (%s)', (name, value) => {
        expect(problems({ ...valid, [name]: value })).toContain(name);
    });
});

describe('parseOrigins', () => {
    it('splits on commas and trims spaces', () => {
        expect(parseOrigins('https://a.uz, http://localhost:5173 ,')).toEqual(['https://a.uz', 'http://localhost:5173']);
    });
});
