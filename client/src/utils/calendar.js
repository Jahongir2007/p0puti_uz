import { TASHKENT_OFFSET } from "./helpers";

// Calendar maths on "YYYY-MM-DD" strings, in Tashkent time (UTC+5, no DST) whatever the phone's zone.
// Dates are handled as UTC midnights, so no local time zone or DST can shift a day.

const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Today's date in Tashkent
export function tashkentToday(now = Date.now()) {
  return toYmd(new Date(now + TASHKENT_OFFSET));
}

// The current hour (0–23) in Tashkent
export function tashkentHour(now = Date.now()) {
  return new Date(now + TASHKENT_OFFSET).getUTCHours();
}

export function addDays(ymd, days) {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return toYmd(d);
}

// 0 = Monday … 6 = Sunday (Uzbekistan's weeks start on Monday)
export function mondayIndex(ymd) {
  return (parseYmd(ymd).getUTCDay() + 6) % 7;
}

// The weeks of a month, Monday first: 7 cells each, null outside the month
export function monthGrid(year, month) {
  const first = toYmd(new Date(Date.UTC(year, month, 1)));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array(mondayIndex(first)).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

// { year, month } of a date, and the month before/after it
export const monthOf = (ymd) => ({ year: parseYmd(ymd).getUTCFullYear(), month: parseYmd(ymd).getUTCMonth() });
export function shiftMonth({ year, month }, by) {
  const d = new Date(Date.UTC(year, month + by, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

// Noon in Tashkent on that day, as an ISO string: what formatDeparture() reads
export const ymdToIso = (ymd) => `${ymd}T12:00:00+05:00`;

// ---------- times of day ("HH:MM") ----------

export const fromHHMM = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export function toHHMM(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440; // wraps past midnight
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

// Minutes since midnight in Tashkent
export function tashkentMinutes(now = Date.now()) {
  const d = new Date(now + TASHKENT_OFFSET);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// The earliest departure the server accepts (strictly after now), on a 5-minute mark
export function earliestDeparture(now = Date.now()) {
  const next = Math.floor(tashkentMinutes(now) / 5) * 5 + 5;
  const today = tashkentToday(now);
  return next < 1440 ? { date: today, time: toHHMM(next) } : { date: addDays(today, 1), time: "00:00" };
}

// What the create-ad form starts with: 08:00 if that's still ahead today, else the next full hour,
// else tomorrow at 08:00
export function defaultDeparture(now = Date.now()) {
  const mins = tashkentMinutes(now);
  const today = tashkentToday(now);
  if (mins < 8 * 60) return { date: today, time: "08:00" };
  const nextHour = (Math.floor(mins / 60) + 1) * 60;
  if (nextHour < 1440) return { date: today, time: toHHMM(nextHour) };
  return { date: addDays(today, 1), time: "08:00" };
}
