import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import SearchPage from "./search.page";
import { useAuthStore } from "../stores/auth.store";
import { fakeServer } from "../test/http";
import { renderWithApp } from "../test/render";

const driverAd = {
  id: "1",
  type: "DRIVER",
  fromLocation: "Zarafshon",
  toLocation: "Toshkent",
  departureTime: "2026-12-05T03:00:00Z",
  price: 150000,
  seats: 3,
  user: { firstName: "Ali" },
  vehicle: { brand: "Chevrolet", model: "Cobalt", color: "oq" },
};
const passengerAd = {
  id: "2",
  type: "PASSENGER",
  fromLocation: "Zarafshon",
  toLocation: "Toshkent",
  departureTime: "2026-12-05T05:00:00Z",
  price: null,
  seats: 2,
  user: { firstName: "Vali" },
};

const tashkentToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(new Date());

// GET /ad/latest and GET /ad/search; `answers` overrides one of them
function server({ latest = [driverAd, passengerAd], found = [driverAd], answers = {} } = {}) {
  const requests = fakeServer((config) => {
    if (answers[config.url]) return answers[config.url](config);
    if (config.url === "/ad/latest") return [200, { success: true, data: latest, nextCursor: null }];
    if (config.url === "/ad/search") return [200, { success: true, data: found, nextCursor: null }];
    throw new Error(`Unexpected request: ${config.url}`);
  });
  return { searches: () => requests.filter((r) => r.url === "/ad/search").map((r) => r.params) };
}

function renderPage() {
  const onNavigate = vi.fn();
  renderWithApp(<SearchPage onNavigate={onNavigate} />, { me: { id: "1" } });
  return onNavigate;
}

const results = () => screen.queryAllByRole("button", { name: /Ali|Vali/ });

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token" });
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
});

describe("Search page", () => {
  it("shows the latest ads before searching, and opens one when tapped", async () => {
    server();
    const onNavigate = renderPage();
    expect(await screen.findByText(/So‘nggi e’lonlar \(2\)/)).toBeTruthy();
    expect(screen.getByText("Chevrolet Cobalt (oq)")).toBeTruthy();

    fireEvent.click(results()[0]);
    expect(onNavigate).toHaveBeenCalledWith("ad", "1");
  });

  it("searches the route, today's date and the number of passengers", async () => {
    const api = server();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Oshirish" }));
    fireEvent.click(screen.getByRole("button", { name: "Qidirish" }));

    expect(await screen.findByText(/Qidiruv natijalari \(1\)/)).toBeTruthy();
    expect(api.searches()).toEqual([
      expect.objectContaining({ from: "Zarafshon", to: "Toshkent", date: tashkentToday(), passenger: 2 }),
    ]);
    expect(api.searches()[0].type).toBeUndefined(); // both kinds of ads

    fireEvent.click(screen.getByRole("button", { name: "Tozalash" }));
    expect(await screen.findByText(/So‘nggi e’lonlar \(2\)/)).toBeTruthy();
  });

  it("swaps the cities", async () => {
    const api = server();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Yo‘nalishlarni almashtirish" }));
    fireEvent.click(screen.getByRole("button", { name: "Qidirish" }));
    await waitFor(() => expect(api.searches()).toHaveLength(1));
    expect(api.searches()[0]).toMatchObject({ from: "Toshkent", to: "Zarafshon" });
  });

  it("keeps the passenger count between 1 and 8", async () => {
    server();
    renderPage();
    const more = await screen.findByRole("button", { name: "Oshirish" });
    for (let i = 0; i < 10; i++) fireEvent.click(more);
    expect(screen.getByText("8 kishi")).toBeTruthy();
    const less = screen.getByRole("button", { name: "Kamaytirish" });
    for (let i = 0; i < 10; i++) fireEvent.click(less);
    expect(screen.getByText("1 kishi")).toBeTruthy();
  });

  it("with the 'drivers only' filter: hides passenger ads and searches drivers only", async () => {
    const api = server();
    renderPage();
    await screen.findByText(/So‘nggi e’lonlar \(2\)/);

    fireEvent.click(screen.getByRole("button", { name: "Filtrlash" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Yo'lovchilar" }));
    fireEvent.click(screen.getByRole("button", { name: "Filtrni qo'llash" }));

    expect(await screen.findByText(/So‘nggi e’lonlar \(1\)/)).toBeTruthy();
    expect(results().map((r) => r.textContent)).toEqual([expect.stringContaining("Ali")]);

    fireEvent.click(screen.getByRole("button", { name: "Qidirish" }));
    await waitFor(() => expect(api.searches()).toHaveLength(1));
    expect(api.searches()[0].type).toBe("DRIVER");
  });

  it("says so when nothing goes that way", async () => {
    server({ found: [] });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Qidirish" }));
    expect(await screen.findByText("Bu yo‘nalish bo‘yicha e’lon topilmadi")).toBeTruthy();
  });

  it("offers a retry when the search fails", async () => {
    let calls = 0;
    server({ answers: { "/ad/search": () => (++calls === 1 ? [500, {}] : [200, { success: true, data: [driverAd], nextCursor: null }]) } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Qidirish" }));
    fireEvent.click(await screen.findByRole("button", { name: "Qayta urinish" }));
    expect(await screen.findByText(/Qidiruv natijalari \(1\)/)).toBeTruthy();
  });
});
