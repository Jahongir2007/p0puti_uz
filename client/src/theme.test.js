import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeTelegram } from "./test/telegram";

// theme.js reads window.Telegram when it loads, so each test loads a fresh copy
const loadTheme = () => import("./theme");
const isDark = () => document.documentElement.classList.contains("dark");

beforeEach(() => {
  vi.resetModules();
  delete window.matchMedia;
});

describe("theme", () => {
  it("defaults to automatic: follows Telegram's dark theme and colours Telegram's header", async () => {
    const tg = fakeTelegram({ colorScheme: "dark" });
    const { initTheme, getThemePref } = await loadTheme();
    initTheme();
    expect(getThemePref()).toBe("auto");
    expect(isDark()).toBe(true);
    expect(tg.setHeaderColor).toHaveBeenCalledWith("#0c1322");
    expect(tg.setBackgroundColor).toHaveBeenCalledWith("#0c1322");
  });

  it("follows Telegram's light theme", async () => {
    const tg = fakeTelegram({ colorScheme: "light" });
    (await loadTheme()).initTheme();
    expect(isDark()).toBe(false);
    expect(tg.setHeaderColor).toHaveBeenCalledWith("#f8fafc");
  });

  it("switches live when the user changes Telegram's theme", async () => {
    const tg = fakeTelegram({ colorScheme: "light" });
    (await loadTheme()).initTheme();
    tg.colorScheme = "dark";
    tg.handlers.themeChanged();
    expect(isDark()).toBe(true);
  });

  it("a chosen theme overrides Telegram and is remembered after a reload", async () => {
    fakeTelegram({ colorScheme: "dark" });
    const theme = await loadTheme();
    theme.initTheme();
    theme.setThemePref("light");
    expect(isDark()).toBe(false);

    vi.resetModules();
    const reloaded = await loadTheme();
    reloaded.initTheme();
    expect(reloaded.getThemePref()).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("outside Telegram, follows the phone's setting", async () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn() }));
    (await loadTheme()).initTheme();
    expect(isDark()).toBe(true);
  });

  it("ignores a broken saved value", async () => {
    localStorage.setItem("theme", "purple");
    fakeTelegram();
    expect((await loadTheme()).getThemePref()).toBe("auto");
  });
});
