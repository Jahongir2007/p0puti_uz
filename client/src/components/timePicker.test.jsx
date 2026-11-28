import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import i18n from "../i18n";
import { TimePickerSheet } from "./timePicker.component";
import { renderWithApp } from "../test/render";

afterEach(() => i18n.changeLanguage("uz"));

function renderPicker(props = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  renderWithApp(<TimePickerSheet value={null} onSelect={onSelect} onClose={onClose} {...props} />);
  return { onSelect, onClose };
}
const finishAnimation = () => fireEvent.animationEnd(screen.getByRole("dialog"));
const slot = (time) => screen.getByRole("button", { name: time });

describe("TimePickerSheet", () => {
  it("explains what the time means, and starts on 'any time'", async () => {
    renderPicker();
    expect(await screen.findByRole("dialog", { name: "Vaqtni tanlang" })).toBeTruthy();
    expect(screen.getByText("Shu vaqtdan keyin jo‘naydigan safarlar ko‘rsatiladi")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Istalgan vaqt/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("offers every hour of the day, grouped into night, morning, day and evening", async () => {
    renderPicker();
    await screen.findByRole("dialog");
    for (const part of ["Tun", "Ertalab", "Kunduzi", "Kechqurun"]) expect(screen.getByText(part)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^\d\d:00$/ })).toHaveLength(24);
  });

  it("chooses an hour with one tap, after the sheet slides down", async () => {
    const { onSelect } = renderPicker();
    fireEvent.click(await screen.findByRole("button", { name: "14:00" }));
    expect(onSelect).not.toHaveBeenCalled();
    finishAnimation();
    expect(onSelect).toHaveBeenCalledWith("14:00");
  });

  it("goes back to any time", async () => {
    const { onSelect } = renderPicker({ value: "14:00" });
    expect((await screen.findByRole("button", { name: "14:00" })).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /Istalgan vaqt/ }));
    finishAnimation();
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("can't choose hours that have already passed today", async () => {
    renderPicker({ minHour: 10 });
    expect((await screen.findByRole("button", { name: "09:00" })).disabled).toBe(true);
    expect(slot("10:00").disabled).toBe(false); // the current hour: from now on
    expect(slot("23:00").disabled).toBe(false);
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
    expect(await screen.findByRole("dialog", { name: "Выберите время" })).toBeTruthy();
    expect(screen.getByText("Утро")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Любое время/ })).toBeTruthy();
  });
});
