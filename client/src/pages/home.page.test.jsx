import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import HomePage from "./home.page";
import { useAuthStore } from "../stores/auth.store";
import { fakeServer } from "../test/http";
import { renderWithApp } from "../test/render";

const ad = (id, toLocation = "Samarqand") => ({
  id,
  type: "DRIVER",
  fromLocation: "Toshkent",
  toLocation,
  departureTime: "2026-12-05T03:00:00Z",
  seats: 3,
});

let observers = [];
const scrollToBottom = () => act(() => observers.forEach((o) => o.callback([{ isIntersecting: true }])));

function renderPage() {
  const onNavigate = vi.fn();
  renderWithApp(<HomePage onNavigate={onNavigate} />, { me: { id: "1" } });
  return onNavigate;
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token" });
  observers = [];
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      observers = observers.filter((o) => o !== this);
    }
  };
});

describe("Home page", () => {
  it("lists the latest ads and opens one when tapped", async () => {
    fakeServer(() => [200, { success: true, data: [ad("1")], nextCursor: null }]);
    const onNavigate = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Toshkent → Samarqand/ }));
    expect(onNavigate).toHaveBeenCalledWith("ad", "1");
    expect(screen.getByText("Hammasi shu")).toBeTruthy();
  });

  it("loads more ads when scrolled to the bottom", async () => {
    const requests = fakeServer((config) =>
      config.params.cursor === "1"
        ? [200, { success: true, data: [ad("2", "Buxoro")], nextCursor: null }]
        : [200, { success: true, data: [ad("1")], nextCursor: "1" }]
    );
    renderPage();
    await screen.findByRole("button", { name: /Toshkent → Samarqand/ });
    scrollToBottom();
    expect(await screen.findByRole("button", { name: /Toshkent → Buxoro/ })).toBeTruthy();
    expect(requests.map((r) => r.params.cursor)).toEqual([null, "1"]);
  });

  it("says so when there are no ads yet, and offers a retry when they don't load", async () => {
    let calls = 0;
    fakeServer(() => (++calls === 1 ? [500, {}] : [200, { success: true, data: [], nextCursor: null }]));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Qayta urinish" }));
    expect(await screen.findByText("Hozircha e’lonlar yo‘q")).toBeTruthy();
  });

  it("goes to search and to posting an ad", async () => {
    fakeServer(() => [200, { success: true, data: [], nextCursor: null }]);
    const onNavigate = renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /Safar topish/ }))[0]);
    expect(onNavigate).toHaveBeenCalledWith("search");
    fireEvent.click(screen.getByRole("button", { name: /E’lon berish/ }));
    expect(onNavigate).toHaveBeenCalledWith("create");
  });
});
