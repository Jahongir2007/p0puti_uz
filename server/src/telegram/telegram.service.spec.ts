import crypto from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { TelegramService } from './telegram.service.js';

const BOT_TOKEN = '123456789:TEST_TOKEN';
const service = new TelegramService({ getOrThrow: () => BOT_TOKEN } as any);

// Builds initData exactly like Telegram does: sorted "key=value" lines, HMAC-SHA256 with
// a key derived from the bot token. Fields are given decoded; the result is URL-encoded.
function signedInitData(fields: Record<string, string>, token = BOT_TOKEN) {
    const dataCheckString = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
    return new URLSearchParams({ ...fields, hash }).toString();
}

const now = () => String(Math.floor(Date.now() / 1000));
const tgUser = { id: 700000001, first_name: 'Ali', last_name: 'Valiyev', username: 'ali', photo_url: 'https://t.me/i/a.jpg' };

const rejection = (initData: string) => {
    try {
        service.validateInitData(initData);
        return null;
    } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        return (err as Error).message;
    }
};

describe('TelegramService.validateInitData', () => {
    it('accepts correctly signed data and returns the user', () => {
        const user = service.validateInitData(signedInitData({ auth_date: now(), user: JSON.stringify(tgUser) }));
        expect(user).toEqual({ id: 700000001, firstName: 'Ali', lastName: 'Valiyev', username: 'ali', photoUrl: 'https://t.me/i/a.jpg' });
    });

    it('rejects data without a hash', () => {
        expect(rejection(new URLSearchParams({ auth_date: now(), user: JSON.stringify(tgUser) }).toString()))
            .toBe('Telegram hash is missing');
    });

    it('rejects data signed with another bot token', () => {
        expect(rejection(signedInitData({ auth_date: now(), user: JSON.stringify(tgUser) }, '999:OTHER')))
            .toBe('Invalid Telegram initData');
    });

    it('rejects data changed after signing (someone swapping in another user id)', () => {
        const tampered = signedInitData({ auth_date: now(), user: JSON.stringify(tgUser) })
            .replace(encodeURIComponent('700000001'), encodeURIComponent('700000002'));
        expect(rejection(tampered)).toBe('Invalid Telegram initData');
    });

    it('rejects a garbage hash without crashing', () => {
        expect(rejection('auth_date=1&user=%7B%7D&hash=zz')).toBe('Invalid Telegram initData');
    });

    it('rejects login data older than 24 hours', () => {
        const old = String(Math.floor(Date.now() / 1000) - 25 * 3600);
        expect(rejection(signedInitData({ auth_date: old, user: JSON.stringify(tgUser) }))).toBe('Telegram initData has expired');
    });

    it('rejects an auth_date in the future', () => {
        const future = String(Math.floor(Date.now() / 1000) + 3600);
        expect(rejection(signedInitData({ auth_date: future, user: JSON.stringify(tgUser) }))).toBe('Telegram initData has expired');
    });

    it('rejects signed data without auth_date or without a user', () => {
        expect(rejection(signedInitData({ user: JSON.stringify(tgUser) }))).toBe('Telegram auth_date is missing');
        expect(rejection(signedInitData({ auth_date: now() }))).toBe('Telegram user is missing');
    });

    it('rejects a signed but unreadable user field', () => {
        expect(rejection(signedInitData({ auth_date: now(), user: '{not json' }))).toBe('Invalid Telegram user data');
    });
});
