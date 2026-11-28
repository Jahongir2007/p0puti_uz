import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

// The page and its helpers read window.Telegram once, when they load: fake it before the imports run
const tg = vi.hoisted(() => {
  const tg = {
    initData: "fake-init-data",
    isVersionAtLeast: () => true,
    showConfirm: vi.fn(),
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
  };
  window.Telegram = { WebApp: tg };
  return tg;
});

import UserAdsPage from "./userAds.page";
import { useAuthStore } from "../stores/auth.store";
import { fakeServer } from "../test/http";
import { renderWithApp } from "../test/render";

const ad = (id, extra = {}) => ({
  id,
  type: "DRIVER",
  fromLocation: "Toshkent",
  toLocation: "Samarqand",
  departureTime: "2026-12-05T03:00:00Z",
  price: 150000,
  seats: 3,
  description: "Konditsioner bor",
  ...extra,
});

// jsdom has no IntersectionObserver: record them, so a test can "scroll to the bottom"
let observers = [];
class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }
  observe() {}
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
}
const scrollToBottom = () => act(() => observers.forEach((o) => o.callback([{ isIntersecting: true }])));

// A fake backend. `pages` are the answers for GET /ad/user, by cursor; `answers` overrides one route
function server({ pages = { first: { data: [ad("1")], nextCursor: null } }, answers = {} } = {}) {
  const requests = fakeServer((config) => {
    const route = `${config.method} ${config.url.replace(/\/\d+$/, "/:id")}`;
    if (answers[route]) return typeof answers[route] === "function" ? answers[route](config) : answers[route];
    if (route === "post /auth/telegram") return [201, { user: { success: true, data: { user: { id: "1" }, accessToken: "token" } } }];
    if (route === "get /ad/user") return [200, { success: true, ...pages[config.params.cursor ?? "first"] }];
    if (route === "patch /ad/:id") return [200, { success: true, data: {} }];
    if (route === "delete /ad/:id") return [200, { success: true, data: {} }];
    throw new Error(`Unexpected request: ${route}`);
  });
  const sent = (route) => requests.filter((r) => `${r.method} ${r.url.replace(/\/\d+$/, "/:id")}` === route);
  return { requests, sent };
}

function renderPage() {
  const onNavigate = vi.fn();
  const view = renderWithApp(<UserAdsPage onNavigate={onNavigate} />);
  return { onNavigate, ...view };
}

beforeEach(() => {
  vi.clearAllMocks();
  observers = [];
  window.IntersectionObserver = FakeIntersectionObserver;
  window.Telegram = { WebApp: tg }; // logging in reads it on every call; the shared cleanup removes it
  useAuthStore.setState({ user: null, accessToken: null });
});

describe("My ads page", () => {
  it("lists my ads, and opens one when tapped", async () => {
    server();
    const { onNavigate } = renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Toshkent → Samarqand/ }));
    expect(onNavigate).toHaveBeenCalledWith("ad", "1");
    expect(screen.getByText(/^150\s000 so‘m$/)).toBeTruthy();
    expect(screen.getByText("3 ta joy")).toBeTruthy();
    expect(screen.getByText("Hammasi shu")).toBeTruthy(); // no more pages
  });

  it("loads the next page when scrolled to the bottom", async () => {
    const api = server({
      pages: {
        first: { data: [ad("1")], nextCursor: "1" },
        1: { data: [ad("2", { toLocation: "Buxoro" })], nextCursor: null },
      },
    });
    renderPage();
    await screen.findByRole("button", { name: /Toshkent → Samarqand/ });
    expect(screen.queryByText("Hammasi shu")).toBeNull();

    scrollToBottom();
    expect(await screen.findByRole("button", { name: /Toshkent → Buxoro/ })).toBeTruthy();
    expect(api.sent("get /ad/user").map((r) => r.params.cursor)).toEqual([undefined, "1"]);
  });

  it("invites me to post my first ad when I have none", async () => {
    server({ pages: { first: { data: [], nextCursor: null } } });
    const { onNavigate } = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "E’lon berish" }));
    expect(onNavigate).toHaveBeenCalledWith("create");
  });

  it("offers a retry when the list doesn't load", async () => {
    let calls = 0;
    server({ answers: { "get /ad/user": () => (++calls === 1 ? [500, {}] : [200, { success: true, data: [ad("1")], nextCursor: null }]) } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Qayta urinish" }));
    expect(await screen.findByRole("button", { name: /Toshkent → Samarqand/ })).toBeTruthy();
  });

  it("edits price, seats and note, and shows the new values", async () => {
    const api = server();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Tahrirlash" }));
    fireEvent.change(screen.getByDisplayValue("150000"), { target: { value: "120000" } });
    fireEvent.click(screen.getByRole("button", { name: "Oshirish" }));
    fireEvent.change(screen.getByDisplayValue("Konditsioner bor"), { target: { value: "  Bagaj bor  " } });
    fireEvent.click(screen.getByRole("button", { name: "Saqlash" }));

    expect(await screen.findByText(/^120\s000 so‘m$/)).toBeTruthy(); // the form closed, the card shows the change
    expect(screen.getByText("4 ta joy")).toBeTruthy();
    const [patch] = api.sent("patch /ad/:id");
    expect(patch.url).toBe("/ad/1");
    expect(JSON.parse(patch.data)).toEqual({ price: 120000, seats: 4, description: "Bagaj bor" });
  });

  it.each([
    ["AD_DEPARTED", "Safar boshlangan"],
    ["AD_NOT_FOUND", "E’lon topilmadi"],
  ])("explains why an edit was refused (%s) and reloads the real list", async (code, title) => {
    const api = server({ answers: { "patch /ad/:id": [200, { success: false, code, message: code }] } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Tahrirlash" }));
    fireEvent.click(screen.getByRole("button", { name: "Saqlash" }));

    expect(await screen.findByRole("alertdialog", { name: title })).toBeTruthy();
    await waitFor(() => expect(api.sent("get /ad/user")).toHaveLength(2));
  });

  it("cancels an ad only after I confirm, and removes it from the list", async () => {
    const api = server({ pages: { first: { data: [ad("1"), ad("2", { toLocation: "Buxoro" })], nextCursor: null } } });
    renderPage();
    const card = (await screen.findByRole("button", { name: /Toshkent → Samarqand/ })).parentElement;

    tg.showConfirm.mockImplementationOnce((message, answer) => answer(false));
    fireEvent.click(within(card).getByRole("button", { name: "O‘chirish" }));
    await waitFor(() => expect(tg.showConfirm).toHaveBeenCalledTimes(1));
    expect(api.sent("delete /ad/:id")).toHaveLength(0);

    tg.showConfirm.mockImplementationOnce((message, answer) => answer(true));
    fireEvent.click(within(card).getByRole("button", { name: "O‘chirish" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Toshkent → Samarqand/ })).toBeNull());
    expect(api.sent("delete /ad/:id")[0].url).toBe("/ad/1");
    expect(screen.getByRole("button", { name: /Toshkent → Buxoro/ })).toBeTruthy(); // the other ad stays
  });

  it("explains a refused cancellation (the ad is already gone) and reloads the real list", async () => {
    const api = server({ answers: { "delete /ad/:id": [200, { success: false, code: "AD_NOT_FOUND", message: "Ad not found" }] } });
    tg.showConfirm.mockImplementation((message, answer) => answer(true));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "O‘chirish" }));

    expect(await screen.findByRole("alertdialog", { name: "E’lon topilmadi" })).toBeTruthy();
    await waitFor(() => expect(api.sent("get /ad/user")).toHaveLength(2));
  });

  it("shows an error and keeps the ad when cancelling fails", async () => {
    server({ answers: { "delete /ad/:id": [500, {}] } });
    tg.showConfirm.mockImplementation((message, answer) => answer(true));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "O‘chirish" }));

    expect(await screen.findByRole("alertdialog", { name: "E’lon o‘chirilmadi" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Toshkent → Samarqand/ })).toBeTruthy();
  });

  it("goes back to the profile with its own button and Telegram's back button", async () => {
    server();
    const { onNavigate } = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Orqaga" }));
    expect(onNavigate).toHaveBeenCalledWith("profile");

    onNavigate.mockClear();
    tg.BackButton.onClick.mock.calls[0][0]();
    expect(onNavigate).toHaveBeenCalledWith("profile");
  });
});
