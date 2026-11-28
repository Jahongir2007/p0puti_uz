import { Temporal } from 'temporal-polyfill';
import {
    decodeCursor,
    encodeCursor,
    escapeHtml,
    formatDate,
    serialize,
    startOfDayInTashkent,
    tashkentToInstant,
    toMin,
    toTime,
} from './helpers.js';

describe('tashkentToInstant', () => {
    it('reads the date and time as Tashkent time (UTC+5)', () => {
        expect(tashkentToInstant('2026-12-05', '09:30').toString()).toBe('2026-12-05T04:30:00Z');
    });

    it('handles times after 19:00, which are the next day in UTC', () => {
        expect(tashkentToInstant('2026-12-05', '23:15').toString()).toBe('2026-12-05T18:15:00Z');
    });

    it('throws on a missing or broken time instead of guessing', () => {
        expect(() => tashkentToInstant('2026-12-05', undefined)).toThrow();
        expect(() => tashkentToInstant('2026-12-05', 'xx:yy')).toThrow();
    });
});

describe('cursors', () => {
    it('round-trips through encode/decode', () => {
        const cursor = { t: '2026-12-05T04:30:00Z', id: '42' };
        expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    });

    it('rejects garbage, so a bad cursor never reaches a query', () => {
        expect(() => decodeCursor('not-a-cursor')).toThrow();
        expect(() => decodeCursor(encodeCursor({ t: 'yesterday', id: '1' }))).toThrow();
        expect(() => decodeCursor(encodeCursor({ t: '2026-12-05T04:30:00Z', id: 'abc' }))).toThrow();
    });
});

describe('small formatters', () => {
    it('escapeHtml makes user text safe for Telegram HTML messages', () => {
        expect(escapeHtml('<b>Tom & Jerry</b>')).toBe('&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;');
    });

    it('formatDate turns YYYY-MM-DD into DD.MM.YYYY', () => {
        expect(formatDate('2026-12-05')).toBe('05.12.2026');
    });

    it('toMin and toTime convert HH:mm and minutes both ways', () => {
        expect(toMin('09:30')).toBe(570);
        expect(toTime(570)).toBe('09:30');
        expect(toTime(toMin('23:59'))).toBe('23:59');
    });
});

describe('serialize', () => {
    it('turns BigInt into strings and Instants/Dates into ISO strings, deeply', () => {
        const value = {
            id: 7n,
            at: Temporal.Instant.from('2026-01-01T00:00:00Z'),
            when: new Date(0),
            list: [1n, { nested: 2n }],
            empty: null,
            text: 'ok',
        };
        expect(serialize(value)).toEqual({
            id: '7',
            at: '2026-01-01T00:00:00.000Z',
            when: '1970-01-01T00:00:00.000Z',
            list: ['1', { nested: '2' }],
            empty: null,
            text: 'ok',
        });
    });
});

describe('startOfDayInTashkent', () => {
    it('returns Tashkent midnight, even when the UTC date is still the day before', () => {
        // 20:00 UTC on Dec 5 is already 01:00 on Dec 6 in Tashkent
        const start = startOfDayInTashkent(new Date('2026-12-05T20:00:00Z'));
        expect(start.toISOString()).toBe('2026-12-05T19:00:00.000Z');
    });
});
