// import { Temporal } from '@js-temporal/polyfill';
import { Timestamptz } from '@prisma/orm-postgres/target/codec-types';
import { Temporal } from 'temporal-polyfill';
export function tashkentToInstant(
    date: string,
    time: string | Timestamptz | undefined,
): Temporal.Instant {
    return Temporal.ZonedDateTime.from({
        timeZone: 'Asia/Tashkent',
        year: Number(date.slice(0, 4)),
        month: Number(date.slice(5, 7)),
        day: Number(date.slice(8, 10)),
        hour: Number(time?.slice(0, 2)),
        minute: Number(time?.slice(3, 5)),
        second: 0,
    }).toInstant();
}

export type Cursor = { t: string; id: string };

export const encodeCursor = (c: Cursor) =>
    Buffer.from(JSON.stringify(c)).toString('base64url');

export const decodeCursor = (s: string): Cursor => {
    const c = JSON.parse(Buffer.from(s, 'base64url').toString());
    // validate: throws on garbage, so bad cursors become a 400, not a crash
    Temporal.Instant.from(c.t);
    BigInt(c.id);
    return c;
};

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const formatDate = (iso: string) => iso.split('-').reverse().join('.');

// "HH:mm" -> minutes since midnight
export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// minutes -> "HH:mm"
export const toTime = (min: number) => {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export function isInstant(value: unknown): value is { epochMilliseconds: number } {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as any)[Symbol.toStringTag] === 'Temporal.Instant'
    );
}

export function serialize(value: unknown): unknown {
    if (typeof value === 'bigint') return value.toString();
    if (isInstant(value)) return new Date(value.epochMilliseconds).toISOString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
    }
    return value;
}

const TZ = 'Asia/Tashkent';
export function startOfDayInTashkent(now: Date): Date {
  const zdt = Temporal.Instant
    .fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(TZ)
    .startOfDay();
  return new Date(zdt.epochMilliseconds);
}