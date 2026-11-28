import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDeparture, formatMonthYear } from "./helpers";

// "Now" is Saturday 5 Dec 2026, 11:00 in Tashkent (06:00 UTC)
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-05T06:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("formatDeparture", () => {
  it("shows today's rides as Bugun, in Tashkent time", () => {
    expect(formatDeparture("2026-12-05T09:00:00Z", "uz")).toEqual({ day: "Bugun", date: "5-dek", time: "14:00" });
  });

  it("shows tomorrow's rides as Ertaga / Завтра", () => {
    expect(formatDeparture("2026-12-06T04:00:00Z", "uz")).toEqual({ day: "Ertaga", date: "6-dek", time: "09:00" });
    expect(formatDeparture("2026-12-06T04:00:00Z", "ru").day).toBe("Завтра");
  });

  it("counts 00:30 Tashkent as the next day, even though it is still the 5th in UTC", () => {
    expect(formatDeparture("2026-12-05T19:30:00Z", "uz")).toMatchObject({ day: "Ertaga", date: "6-dek", time: "00:30" });
  });

  it("shows later rides with the weekday name", () => {
    expect(formatDeparture("2026-12-08T04:00:00Z", "uz")).toEqual({ day: "Seshanba", date: "8-dek", time: "09:00" });
    expect(formatDeparture("2026-12-08T04:00:00Z", "ru")).toEqual({ day: "Вторник", date: "8 дек", time: "09:00" });
  });

  it("falls back to Uzbek for an unknown language", () => {
    expect(formatDeparture("2026-12-05T09:00:00Z", "en").day).toBe("Bugun");
  });
});

describe("formatMonthYear", () => {
  it("uses the app's own month names (browsers print 2026 M09 for Uzbek)", () => {
    expect(formatMonthYear("2026-09-14T10:00:00Z", "uz")).toBe("sen 2026");
    expect(formatMonthYear("2026-09-14T10:00:00Z", "ru")).toBe("сен 2026");
  });
});
