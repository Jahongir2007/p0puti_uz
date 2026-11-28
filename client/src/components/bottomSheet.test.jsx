import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CircleCheck } from "lucide-react";
import { BottomSheet } from "./bottomSheet.component";
import { fakeTelegram } from "../test/telegram";

const sheet = (props = {}) =>
  render(<BottomSheet tone="success" icon={CircleCheck} title="Saved" message="All good" actionLabel="OK" {...props} />);

// The sheet slides down before it calls onClose; jsdom doesn't animate, so finish the animation by hand
const finishAnimation = () => fireEvent.animationEnd(screen.getByRole("alertdialog"));

describe("BottomSheet", () => {
  it("shows the title, message and button as an accessible alert dialog", () => {
    sheet();
    const dialog = screen.getByRole("alertdialog", { name: "Saved" });
    expect(dialog).toHaveProperty("textContent", expect.stringContaining("All good"));
    expect(screen.getByRole("button", { name: "OK" })).toBeTruthy();
  });

  it("vibrates the phone to match the tone", async () => {
    vi.resetModules();
    const tg = fakeTelegram();
    const { BottomSheet: FreshSheet } = await import("./bottomSheet.component");
    render(<FreshSheet tone="error" icon={CircleCheck} title="t" message="m" actionLabel="OK" />);
    expect(tg.HapticFeedback.notificationOccurred).toHaveBeenCalledWith("error");
  });

  it("closes with the button, after sliding down", () => {
    const onClose = vi.fn();
    sheet({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).not.toHaveBeenCalled(); // still animating
    finishAnimation();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape and with a tap outside", () => {
    const onClose = vi.fn();
    const { unmount } = sheet({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    finishAnimation();
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    unmount();
    const second = sheet({ onClose });
    fireEvent.click(second.container.querySelector('[aria-hidden="true"]'));
    finishAnimation();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes immediately when the phone asks for reduced motion", () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    const onClose = vi.fn();
    sheet({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    delete window.matchMedia;
  });

  it("can't be dismissed when dismissible is false: only its button acts", () => {
    const onAction = vi.fn();
    const { container } = sheet({ dismissible: false, onAction });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(container.querySelector('[aria-hidden="true"]'));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("locks page scrolling while open", () => {
    const { unmount } = sheet();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
