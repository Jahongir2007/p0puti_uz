import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { useSessionStore } from "../stores/session.store";
import { fakeTelegram } from "../test/telegram";
import { renderWithApp } from "../test/render";

beforeEach(() => useSessionStore.setState({ expired: false }));

// The modal reads window.Telegram when it loads, so load it after faking Telegram
async function renderModal() {
  vi.resetModules();
  const tg = fakeTelegram();
  const { useSessionStore: store } = await import("../stores/session.store");
  const { SessionExpiredModal } = await import("./sessionExpiredModal.component");
  renderWithApp(<SessionExpiredModal />);
  return { tg, store };
}

describe("SessionExpiredModal", () => {
  it("is hidden while the session is fine", async () => {
    await renderModal();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("appears when the session expires, and its button closes the mini app", async () => {
    const { tg, store } = await renderModal();
    act(() => store.getState().markExpired());
    expect(await screen.findByRole("alertdialog", { name: "Sessiya muddati tugadi" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ilovani yopish" }));
    expect(tg.close).toHaveBeenCalled();
  });

  it("can't be dismissed: every request would fail anyway", async () => {
    const { store } = await renderModal();
    act(() => store.getState().markExpired());
    await screen.findByRole("alertdialog");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
