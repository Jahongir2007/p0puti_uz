import { vi } from "vitest";

// A fake Telegram mini app environment (window.Telegram.WebApp), recording what the app calls
export function fakeTelegram(overrides = {}) {
  const handlers = {};
  const tg = {
    initData: "fake-init-data",
    initDataUnsafe: { user: { id: 1, first_name: "Ali", last_name: "Valiyev", username: "ali" } },
    colorScheme: "light",
    isVersionAtLeast: () => true,
    HapticFeedback: { notificationOccurred: vi.fn() },
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    openTelegramLink: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    onEvent: vi.fn((name, fn) => { handlers[name] = fn; }),
    showAlert: vi.fn((m, cb) => cb?.()),
    showConfirm: vi.fn((m, cb) => cb?.(true)),
    close: vi.fn(),
    ready: vi.fn(),
    expand: vi.fn(),
    handlers,
    ...overrides,
  };
  window.Telegram = { WebApp: tg };
  return tg;
}
