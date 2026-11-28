import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import App from "./App";
import { useAuthStore } from "./stores/auth.store";
import { fakeTelegram } from "./test/telegram";
import { fakeServer } from "./test/http";
import { renderWithApp } from "./test/render";

const loggedIn = [201, { user: { success: true, data: { user: { id: "1" }, accessToken: "token" } } }];
const latestAd = {
  id: "5",
  type: "DRIVER",
  fromLocation: "Toshkent",
  toLocation: "Samarqand",
  departureTime: "2026-12-05T03:00:00Z",
  seats: 3,
};

// The whole backend the first screens need
function server({ login = () => loggedIn } = {}) {
  return fakeServer((config) => {
    if (config.url === "/auth/telegram") return login();
    if (config.url === "/ad/latest") return [200, { success: true, data: [latestAd], nextCursor: null }];
    if (config.url === "/ad/5") return [200, { success: true, data: { ad: latestAd, related: [] } }];
    throw new Error(`Unexpected request: ${config.url}`);
  });
}

const navbar = () => screen.getByRole("navigation");

beforeEach(() => {
  fakeTelegram();
  useAuthStore.setState({ user: null, accessToken: null });
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  window.scrollTo = () => {};
});

describe("App", () => {
  it("logs in with Telegram's data, then shows the home page", async () => {
    const requests = server();
    renderWithApp(<App />);
    expect(await screen.findByRole("button", { name: /Toshkent → Samarqand/ })).toBeTruthy();
    expect(JSON.parse(requests[0].data)).toEqual({ initData: "fake-init-data" });
    expect(useAuthStore.getState().accessToken).toBe("token");
  });

  it("shows the error screen when logging in fails, and the retry logs in", async () => {
    let attempts = 0;
    server({ login: () => (++attempts <= 2 ? [500, {}] : loggedIn) }); // useMe retries once
    renderWithApp(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Qaytadan urinish" }, { timeout: 3000 }));
    expect(await screen.findByRole("button", { name: /Toshkent → Samarqand/ })).toBeTruthy();
  });

  it("switches pages with the navbar, and hides the navbar on an ad's page", async () => {
    server();
    renderWithApp(<App />);
    await screen.findByRole("button", { name: /Toshkent → Samarqand/ });

    fireEvent.click(within(navbar()).getByRole("button", { name: "Qidiruv" }));
    expect(await screen.findByRole("heading", { name: "Safar qidirish" })).toBeTruthy();
    expect(within(navbar()).getByRole("button", { name: "Qidiruv" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(within(navbar()).getByRole("button", { name: "Bosh sahifa" }));
    fireEvent.click(await screen.findByRole("button", { name: /Toshkent → Samarqand/ }));
    expect(await screen.findByRole("heading", { name: "Safar tafsilotlari" })).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
