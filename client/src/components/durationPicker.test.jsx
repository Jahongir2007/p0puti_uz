import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import i18n from "../i18n";
import { DurationPickerSheet } from "./durationPicker.component";
import { renderWithApp } from "../test/render";
import { fakeTelegram } from "../test/telegram";

afterEach(() => i18n.changeLanguage("uz"));

function renderSheet(props = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const view = renderWithApp(<DurationPickerSheet value={120} departure="11:00" onSelect={onSelect} onClose={onClose} {...props} />);
  return { onSelect, onClose, ...view };
}
const minutesWheel = () => screen.getByRole("spinbutton", { name: "Daqiqalar" });
const finishAnimation = () => fireEvent.animationEnd(screen.getByRole("dialog"));

describe("DurationPickerSheet", () => {
  it("shows the arrival the app works out, and updates it as the wheels turn", async () => {
    renderSheet();
    expect(await screen.findByRole("dialog", { name: "Yo‘l davomiyligi" })).toBeTruthy();
    expect(screen.getByText("13:00")).toBeTruthy(); // 11:00 + 2 h
    fireEvent.click(within(minutesWheel()).getByText("45"));
    expect(screen.getByText("13:45")).toBeTruthy();
  });

  it("says when the arrival is the next day", async () => {
    renderSheet({ departure: "22:00" });
    fireEvent.click(within(await screen.findByRole("spinbutton", { name: "Soatlar" })).getByText("3"));
    expect(screen.getByText("01:00")).toBeTruthy();
    expect(screen.getByText("(Ertasi kuni)")).toBeTruthy();
  });

  it("reports the trip length in minutes after Done", async () => {
    const { onSelect } = renderSheet();
    fireEvent.click(within(await screen.findByRole("spinbutton", { name: "Soatlar" })).getByText("4"));
    fireEvent.click(within(minutesWheel()).getByText("30"));
    fireEvent.click(screen.getByRole("button", { name: "Tayyor" }));
    expect(onSelect).not.toHaveBeenCalled(); // sliding down
    finishAnimation();
    expect(onSelect).toHaveBeenCalledWith(270);
  });

  it("won't take a trip of 0 minutes", async () => {
    renderSheet({ value: 30 });
    fireEvent.click(within(await screen.findByRole("spinbutton", { name: "Daqiqalar" })).getByText("00"));
    expect(screen.getByText("Yo‘l vaqtini tanlang")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tayyor" }).disabled).toBe(true);
  });

  it("offers trips under a day: 0–23 hours, minutes in 5-minute steps", async () => {
    renderSheet();
    const hours = within(await screen.findByRole("spinbutton", { name: "Soatlar" }));
    expect(hours.getByText("23")).toBeTruthy();
    expect(hours.queryByText("24")).toBeNull();
    expect(within(minutesWheel()).getAllByText(/^\d\d$/)).toHaveLength(12);
  });

  it("stops Telegram's swipe-down while open, so dragging a wheel doesn't minimize the app", async () => {
    const tg = fakeTelegram({ isVerticalSwipesEnabled: true, disableVerticalSwipes: vi.fn(), enableVerticalSwipes: vi.fn() });
    const { unmount } = renderSheet();
    await screen.findByRole("dialog");
    expect(tg.disableVerticalSwipes).toHaveBeenCalled();
    unmount();
    expect(tg.enableVerticalSwipes).toHaveBeenCalled();
  });

  it("leaves Telegram's swipes alone if they were already off", async () => {
    const tg = fakeTelegram({ isVerticalSwipesEnabled: false, disableVerticalSwipes: vi.fn(), enableVerticalSwipes: vi.fn() });
    const { unmount } = renderSheet();
    await screen.findByRole("dialog");
    unmount();
    expect(tg.disableVerticalSwipes).not.toHaveBeenCalled();
    expect(tg.enableVerticalSwipes).not.toHaveBeenCalled();
  });

  it("speaks Russian too", async () => {
    await i18n.changeLanguage("ru");
    renderSheet();
    expect(await screen.findByRole("dialog", { name: "Время в пути" })).toBeTruthy();
    expect(screen.getByText("Прибытие")).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: "Часы" })).toBeTruthy();
  });
});
