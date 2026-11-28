import { describe, expect, it } from "vitest";
import { DEFAULT_FILTER, filterToAdType } from "./filterModal.component";

describe("filterToAdType", () => {
  it("sends no type when both are ticked, so the server returns everything", () => {
    expect(filterToAdType(DEFAULT_FILTER)).toBeUndefined();
  });

  it("sends DRIVER or PASSENGER when only one is ticked", () => {
    expect(filterToAdType({ drivers: true, passengers: false })).toBe("DRIVER");
    expect(filterToAdType({ drivers: false, passengers: true })).toBe("PASSENGER");
  });
});
