import { describe, expect, it } from "vitest";
import { exactLocation, localizedName, searchLocations } from "./locations";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("ignores case, extra spaces and the different apostrophes people type", () => {
    expect(normalize("  OLTINKO’L   tumani ")).toBe("oltinko'l tumani");
    expect(normalize("Oltinkoʻl")).toBe(normalize("Oltinko`l"));
  });
});

describe("searchLocations", () => {
  it("needs at least 2 characters", () => {
    expect(searchLocations("o")).toEqual([]);
  });

  it("finds places by their Latin, Cyrillic or Russian name", () => {
    expect(searchLocations("oltink").map((l) => l.name)).toContain("Oltinko'l tumani");
    expect(searchLocations("олтинк").map((l) => l.name)).toContain("Oltinko'l tumani");
    expect(searchLocations("алтынк").map((l) => l.name)).toContain("Oltinko'l tumani");
  });

  it("lists names that start with the text before names that only contain it", () => {
    const results = searchLocations("an", 50).map((l) => l.name.toLowerCase());
    const firstContains = results.findIndex((n) => !n.startsWith("an"));
    if (firstContains !== -1) expect(results.slice(firstContains).every((n) => !n.startsWith("an"))).toBe(true);
  });

  it("returns at most the requested number of results", () => {
    expect(searchLocations("tuman", 3).length).toBeLessThanOrEqual(3);
  });
});

describe("exactLocation and localizedName", () => {
  it("matches a typed name exactly, whatever the apostrophe or case", () => {
    expect(exactLocation("OLTINKO’L TUMANI")?.name).toBe("Oltinko'l tumani");
    expect(exactLocation("no such place")).toBeUndefined();
  });

  it("shows a saved place in the user's language", () => {
    expect(localizedName("Oltinko'l tumani", "ru")).toBe("Алтынкульский район");
    expect(localizedName("Oltinko'l tumani", "uz-Cyrl")).toBe("Олтинкўл тумани");
    expect(localizedName("Oltinko'l tumani", "uz")).toBe("Oltinko'l tumani");
  });

  it("shows free text exactly as it was saved", () => {
    expect(localizedName("Toshkent", "ru")).toBe("Toshkent");
  });
});
