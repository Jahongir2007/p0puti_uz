import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";

// The page reads window.Telegram once, when it loads: fake it before the imports below run
const tg = vi.hoisted(() => {
  const tg = {
    openTelegramLink: vi.fn(),
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
  };
  window.Telegram = { WebApp: tg };
  return tg;
});

import AdPage from "./ad.page";
import { useAuthStore } from "../stores/auth.store";
import { fakeServer } from "../test/http";
import { renderWithApp } from "../test/render";

const driverAd = {
  id: "5",
  type: "DRIVER",
  fromLocation: "Toshkent",
  toLocation: "Samarqand",
  departureTime: "2026-12-05T03:00:00Z", // 08:00 in Tashkent
  arrivalTime: "2026-12-05T07:30:00Z", // 12:30
  price: 150000,
  seats: 3,
  luggageAllowed: false,
  description: "Konditsioner bor",
  user: { firstName: "Ali", lastName: "Valiyev", username: "ali_driver", phone: "+998901234567" },
};

const passengerAd = {
  id: "6",
  type: "PASSENGER",
  fromLocation: "Buxoro",
  toLocation: "Toshkent",
  departureTime: "2026-12-06T05:00:00Z",
  arrivalTime: null,
  price: null,
  seats: 2,
  luggageAllowed: false, // the database default: must not be shown for passengers
  user: { firstName: "Vali" },
};

// GET /ad/:id answers with `answer`
function server(answer) {
  return fakeServer(() => (typeof answer === "function" ? answer() : answer));
}
const found = (ad, related = []) => [200, { success: true, data: { ad, related } }];

function renderPage(adId = "5") {
  const onNavigate = vi.fn();
  const view = renderWithApp(<AdPage adId={adId} onNavigate={onNavigate} />);
  return { onNavigate, ...view };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: "token" });
  window.scrollTo = vi.fn(); // jsdom doesn't scroll
});

describe("Ad page", () => {
  it("shows a driver's ad: route, times, price, seats, luggage and the note", async () => {
    const requests = server(found(driverAd));
    renderPage("5");

    expect(await screen.findByText("Haydovchi e’loni")).toBeTruthy();
    expect(requests[0].url).toBe("/ad/5");
    expect(screen.getAllByText("08:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12:30").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^150\s000 so‘m$/).length).toBeGreaterThan(0);
    expect(screen.getByText("Bo‘sh joylar")).toBeTruthy();
    expect(screen.getByText("3 ta joy")).toBeTruthy();
    expect(screen.getByText("Yuk")).toBeTruthy();
    expect(screen.getByText("Mumkin emas")).toBeTruthy();
    expect(screen.getByText("Konditsioner bor")).toBeTruthy();
    expect(screen.getByText("Ali Valiyev")).toBeTruthy();
  });

  it("doesn't show luggage or arrival on a passenger's ad (passengers never set them)", async () => {
    server(found(passengerAd));
    renderPage("6");

    expect(await screen.findByText("Yo‘lovchi e’loni")).toBeTruthy();
    expect(screen.getByText("Kerakli joylar")).toBeTruthy();
    expect(screen.queryByText("Yuk")).toBeNull();
    expect(screen.queryByText("Mumkin emas")).toBeNull();
    expect(screen.queryByText("Yetib borish")).toBeNull();
    expect(screen.getByText("Kelishiladi")).toBeTruthy(); // no price
  });

  it("opens the Telegram chat with the ad's author, and offers a call", async () => {
    server(found(driverAd));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Telegramda yozish" }));
    expect(tg.openTelegramLink).toHaveBeenCalledWith("https://t.me/ali_driver");
    expect(screen.getByRole("link", { name: "Qo‘ng‘iroq qilish" }).getAttribute("href")).toBe("tel:+998901234567");
  });

  it("has no contact bar when the author has neither a username nor a phone", async () => {
    server(found({ ...driverAd, user: { firstName: "Ali" } }));
    renderPage();
    await screen.findByText("Haydovchi e’loni");
    expect(screen.queryByRole("button", { name: "Telegramda yozish" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Qo‘ng‘iroq qilish" })).toBeNull();
  });

  it("opens a similar ad when it's tapped", async () => {
    const related = [{ ...driverAd, id: 12, toLocation: "Buxoro" }];
    server(found(driverAd, related));
    const { onNavigate } = renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Toshkent → Buxoro/ }));
    expect(onNavigate).toHaveBeenCalledWith("ad", "12");
  });

  it("says the ad wasn't found when the server has no such ad", async () => {
    server([200, { success: true, data: null }]);
    renderPage("404");
    expect(await screen.findByText("E’lon topilmadi")).toBeTruthy();
  });

  it("offers a retry when loading fails, and the retry loads the ad", async () => {
    let calls = 0;
    server(() => (++calls === 1 ? [500, {}] : found(driverAd)));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Qayta urinish" }));
    expect(await screen.findByText("Haydovchi e’loni")).toBeTruthy();
    expect(calls).toBe(2);
  });

  it("asks for nothing when no ad is selected", () => {
    const requests = server(found(driverAd));
    renderPage(null);
    expect(screen.queryByText("Haydovchi e’loni")).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it("goes back home with its own button and with Telegram's back button", async () => {
    server(found(driverAd));
    const { onNavigate, unmount } = renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Orqaga" }));
    expect(onNavigate).toHaveBeenCalledWith("home");

    expect(tg.BackButton.show).toHaveBeenCalled();
    const telegramBack = tg.BackButton.onClick.mock.calls[0][0];
    onNavigate.mockClear();
    telegramBack();
    expect(onNavigate).toHaveBeenCalledWith("home");

    unmount();
    expect(tg.BackButton.offClick).toHaveBeenCalledWith(telegramBack);
    expect(tg.BackButton.hide).toHaveBeenCalled();
  });
});
