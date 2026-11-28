import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import i18n from "../i18n";
import { ExactTimePickerSheet } from "./exactTimePicker.component";
import { renderWithApp } from "../test/render";

afterEach(() => i18n.changeLanguage("uz"));

function renderPicker(props = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  renderWithApp(<ExactTimePickerSheet title="Jo‘nash vaqti" value="08:00" onSelect={onSelect} onClose={onClose} {...props} />);
  return { onSelect, onClose };
}
const finishAnimation = () => fireEvent.animationEnd(screen.getByRole("dialog"));
const hour = (h) => screen.getByRole("button", { name: `Soat ${h}` });
const minute = (m) => screen.getByRole("button", { name: `${m} daqiqa` });
const done = () => screen.getByRole("button", { name: "Tayyor" });

describe("ExactTimePickerSheet", () => {
  it("chooses an hour, then minutes, then Done", async () => {
    const { onSelect } = renderPicker();
    expect(await screen.findByText("08:00")).toBeTruthy();
    fireEvent.click(hour("14"));
    fireEvent.click(minute("35"));
    expect(screen.getByText("14:35")).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled(); // nothing is chosen until Done
    fireEvent.click(done());
    finishAnimation();
    expect(onSelect).toHaveBeenCalledWith("14:35");
  });

  it("can't go earlier than `min`: whole hours, then minutes in that hour", async () => {
    renderPicker({ value: "08:00", min: "10:25" });
    expect(await screen.findByText("10:25")).toBeTruthy(); // 08:00 is too early: starts at the minimum
    expect(hour("09").disabled).toBe(true);
    expect(hour("10").disabled).toBe(false);
    expect(minute("20").disabled).toBe(true);
    expect(minute("25").disabled).toBe(false);
  });

  it("keeps the minutes when the hour changes, unless that would be too early", async () => {
    renderPicker({ value: "14:10", min: "10:25" });
    fireEvent.click(await screen.findByRole("button", { name: "Soat 10" }));
    expect(screen.getByText("10:25")).toBeTruthy(); // 10:10 is too early
    fireEvent.click(hour("16"));
    expect(screen.getByText("16:25")).toBeTruthy();
  });

  it("shows a live line under the clock, or the problem, which turns Done off", async () => {
    renderPicker({
      info: (time) => `info ${time}`,
      problem: (time) => (time === "09:00" ? "same as departure" : null),
    });
    expect(await screen.findByText("info 08:00")).toBeTruthy();
    fireEvent.click(hour("09"));
    expect(screen.getByText("same as departure")).toBeTruthy();
    expect(done().disabled).toBe(true);
  });

  it("closes without choosing", async () => {
    const { onSelect, onClose } = renderPicker();
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    finishAnimation();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("speaks Russian too", async () => {
    await i18n.changeLanguage("ru");
    renderPicker();
    expect(await screen.findByRole("button", { name: "Готово" })).toBeTruthy();
    expect(screen.getByText("Часы")).toBeTruthy();
    expect(screen.getByText("Минуты")).toBeTruthy();
  });
});
