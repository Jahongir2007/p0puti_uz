import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Wheel, WHEEL_ROW } from "./wheel.component";
import { fakeTelegram } from "../test/telegram";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

function renderWheel(value = 2) {
  const onChange = vi.fn();
  render(<Wheel values={HOURS} value={value} onChange={onChange} label="Soatlar" />);
  return { onChange, wheel: screen.getByRole("spinbutton", { name: "Soatlar" }) };
}

afterEach(() => vi.useRealTimers());

describe("Wheel", () => {
  it("is a spin button that says its value", () => {
    const { wheel } = renderWheel(2);
    expect(wheel.getAttribute("aria-valuenow")).toBe("2");
    expect(wheel.getAttribute("aria-valuetext")).toBe("2");
  });

  it("chooses the row the scrolling stops at", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { onChange, wheel } = renderWheel(2);
    Object.defineProperty(wheel, "scrollTop", { value: 5 * WHEEL_ROW + 30, writable: true, configurable: true }); // past the middle of row 5
    fireEvent.scroll(wheel);
    vi.advanceTimersByTime(50);
    expect(onChange).not.toHaveBeenCalled(); // still scrolling
    vi.advanceTimersByTime(100);
    expect(onChange).toHaveBeenCalledWith(6); // the nearest row
  });

  it("chooses a row when it's tapped", () => {
    const { onChange, wheel } = renderWheel(2);
    fireEvent.click(within(wheel).getByText("7"));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("moves with the arrow keys, and Home / End jump to the ends", () => {
    const { onChange, wheel } = renderWheel(2);
    fireEvent.keyDown(wheel, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.keyDown(wheel, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(23);
  });

  it("doesn't go past the ends", () => {
    const { onChange, wheel } = renderWheel(0);
    fireEvent.keyDown(wheel, { key: "ArrowUp" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ticks the phone lightly on each change, like a real wheel", () => {
    const tg = fakeTelegram({ HapticFeedback: { selectionChanged: vi.fn() } });
    const { wheel } = renderWheel(2);
    fireEvent.click(within(wheel).getByText("2")); // the current value: nothing to tick
    fireEvent.click(within(wheel).getByText("4"));
    expect(tg.HapticFeedback.selectionChanged).toHaveBeenCalledTimes(1);
  });
});
