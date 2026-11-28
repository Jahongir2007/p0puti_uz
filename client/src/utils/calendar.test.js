import { describe, expect, it } from "vitest";
import {
  addDays,
  defaultDeparture,
  earliestDeparture,
  fromHHMM,
  mondayIndex,
  monthGrid,
  shiftMonth,
  tashkentHour,
  tashkentToday,
  toHHMM,
} from "./calendar";

describe("calendar", () => {
  it("uses Tashkent's date and hour, which is already tomorrow at 20:00 UTC", () => {
    const lateEvening = Date.parse("2026-11-28T20:30:00Z"); // 01:30 on the 29th in Tashkent
    expect(tashkentToday(lateEvening)).toBe("2026-11-29");
    expect(tashkentHour(lateEvening)).toBe(1);
  });

  it("adds days across month and year ends, and leap days", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("starts weeks on Monday", () => {
    expect(mondayIndex("2026-11-30")).toBe(0); // a Monday
    expect(mondayIndex("2026-11-29")).toBe(6); // a Sunday
  });

  it("lays out a month in full weeks, with blanks before the 1st and after the last day", () => {
    const weeks = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null]);
  });

  it("moves between months across the year end", () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2027, month: 0 }, -1)).toEqual({ year: 2026, month: 11 });
  });
});

describe("times of day", () => {
  const at = (iso) => Date.parse(iso);

  it("converts HH:MM to minutes and back, wrapping past midnight", () => {
    expect(fromHHMM("08:30")).toBe(510);
    expect(toHHMM(510)).toBe("08:30");
    expect(toHHMM(1440 + 90)).toBe("01:30");
  });

  it("finds the earliest departure the server accepts: the next 5-minute mark after now", () => {
    expect(earliestDeparture(at("2026-11-28T05:02:00Z"))).toEqual({ date: "2026-11-28", time: "10:05" });
    expect(earliestDeparture(at("2026-11-28T05:05:00Z"))).toEqual({ date: "2026-11-28", time: "10:10" }); // 10:05 is now: too late
    expect(earliestDeparture(at("2026-11-28T18:57:00Z"))).toEqual({ date: "2026-11-29", time: "00:00" }); // 23:57
  });

  it("starts the form at 08:00, or the next full hour once 08:00 has passed, or tomorrow late at night", () => {
    expect(defaultDeparture(at("2026-11-28T01:00:00Z"))).toEqual({ date: "2026-11-28", time: "08:00" }); // 06:00
    expect(defaultDeparture(at("2026-11-28T05:20:00Z"))).toEqual({ date: "2026-11-28", time: "11:00" }); // 10:20
    expect(defaultDeparture(at("2026-11-28T18:10:00Z"))).toEqual({ date: "2026-11-29", time: "08:00" }); // 23:10
  });
});
