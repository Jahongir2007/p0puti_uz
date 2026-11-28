import { describe, expect, it } from "vitest";
import { addDays, mondayIndex, monthGrid, shiftMonth, tashkentHour, tashkentToday } from "./calendar";

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
