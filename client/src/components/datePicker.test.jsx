import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import i18n from "../i18n";
import { DatePickerSheet } from "./datePicker.component";
import { renderWithApp } from "../test/render";

// Saturday 28 November 2026, 10:00 in Tashkent
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-28T05:00:00Z"));
});
afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage("uz");
});

function renderPicker(props = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  renderWithApp(<DatePickerSheet value="2026-11-28" min="2026-11-28" onSelect={onSelect} onClose={onClose} {...props} />);
  return { onSelect, onClose };
}

// The sheet slides down before it reports the choice; jsdom doesn't animate, so finish it by hand
const finishAnimation = () => fireEvent.animationEnd(screen.getByRole("dialog"));
const day = (label) => screen.getByRole("button", { name: label });

describe("DatePickerSheet", () => {
  it("shows the month of the chosen day, weeks starting on Monday", async () => {
    renderPicker();
    const dialog = await screen.findByRole("dialog", { name: "Sanani tanlang" });
    expect(within(dialog).getByText("Noyabr 2026")).toBeTruthy();
    expect(day("28-noyabr, shanba").getAttribute("aria-pressed")).toBe("true");
    expect(day("30-noyabr, dushanba")).toBeTruthy();
  });

  it("chooses a day with one tap, after the sheet slides down", async () => {
    const { onSelect, onClose } = renderPicker();
    fireEvent.click(await screen.findByRole("button", { name: "30-noyabr, dushanba" }));
    expect(onSelect).not.toHaveBeenCalled(); // still sliding down
    finishAnimation();
    expect(onSelect).toHaveBeenCalledWith("2026-11-30");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("can't choose a day that has passed, or go back before this month", async () => {
    renderPicker();
    expect((await screen.findByRole("button", { name: "27-noyabr, juma" })).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Oldingi oy" }).disabled).toBe(true);
  });

  it("goes to the next month and back", async () => {
    const { onSelect } = renderPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Keyingi oy" }));
    expect(screen.getByText("Dekabr 2026")).toBeTruthy();
    fireEvent.click(day("31-dekabr, payshanba"));
    finishAnimation();
    expect(onSelect).toHaveBeenCalledWith("2026-12-31");
  });

  it("crosses into the next year", async () => {
    renderPicker({ value: "2026-12-15" });
    fireEvent.click(await screen.findByRole("button", { name: "Keyingi oy" }));
    expect(screen.getByText("Yanvar 2027")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Oldingi oy" }));
    expect(screen.getByText("Dekabr 2026")).toBeTruthy();
  });

  it("offers Today and Tomorrow as one-tap choices", async () => {
    const { onSelect } = renderPicker();
    fireEvent.click(await screen.findByRole("button", { name: /Ertaga/ }));
    finishAnimation();
    expect(onSelect).toHaveBeenCalledWith("2026-11-29");
    expect(screen.getByRole("button", { name: /Bugun/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it.each([
    ["the X button", (dialog) => fireEvent.click(within(dialog).getByRole("button", { name: "Yopish" }))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
    ["a tap outside", (dialog) => fireEvent.click(dialog.previousSibling)],
  ])("closes without choosing with %s", async (_, closeWith) => {
    const { onSelect, onClose } = renderPicker();
    closeWith(await screen.findByRole("dialog"));
    finishAnimation();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("speaks Russian too", async () => {
    await i18n.changeLanguage("ru");
    renderPicker();
    expect(await screen.findByRole("dialog", { name: "Выберите дату" })).toBeTruthy();
    expect(screen.getByText("Ноябрь 2026")).toBeTruthy();
    expect(screen.getByText("Пн")).toBeTruthy();
    expect(day("28 ноября, суббота")).toBeTruthy();
  });
});
