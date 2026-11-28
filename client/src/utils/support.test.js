import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeTelegram } from "../test/telegram";

// support.js reads VITE_SUPPORT_USERNAME when it loads
const loadWith = async (username) => {
  vi.stubEnv("VITE_SUPPORT_USERNAME", username);
  return import("./support");
};

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe("support link", () => {
  it("opens the support account inside Telegram, with or without @ in the variable", async () => {
    const tg = fakeTelegram();
    const { openSupport, supportUsername } = await loadWith("@p0puti_support");
    expect(supportUsername).toBe("p0puti_support");
    openSupport();
    expect(tg.openTelegramLink).toHaveBeenCalledWith("https://t.me/p0puti_support");
  });

  it("opens a new tab outside Telegram", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { openSupport } = await loadWith("p0puti_support");
    openSupport();
    expect(open).toHaveBeenCalledWith("https://t.me/p0puti_support", "_blank");
  });

  it("has no support account when the variable is empty, so the buttons hide", async () => {
    const tg = fakeTelegram();
    const { openSupport, supportUsername } = await loadWith("");
    expect(supportUsername).toBeNull();
    openSupport();
    expect(tg.openTelegramLink).not.toHaveBeenCalled();
  });
});
