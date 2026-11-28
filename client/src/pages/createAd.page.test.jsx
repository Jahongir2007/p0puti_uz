import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import CreateAdPage from "./createAd.page";
import { useAuthStore } from "../stores/auth.store";
import { useSessionStore } from "../stores/session.store";
import { fakeServer } from "../test/http";
import { renderWithApp } from "../test/render";

const cobalt = { id: "7", brand: "Chevrolet", model: "Cobalt", color: "oq", plateNumber: "01a123bc" };

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token" });
  useSessionStore.setState({ expired: false });
  vi.spyOn(console, "error").mockImplementation(() => {}); // the page logs refused ads
});

// The server: GET /vehicle answers with `vehicles`, POST /ad with `postAnswer`
function server({ vehicles = [cobalt], postAnswer = [201, { success: true, queued: false, data: { id: "1" } }] } = {}) {
  const requests = fakeServer((config) => (config.url === "/vehicle" ? [200, vehicles] : postAnswer));
  return { posted: () => requests.filter((r) => r.method === "post").map((r) => JSON.parse(r.data)) };
}

async function fillAndSubmit() {
  fireEvent.change(await screen.findByPlaceholderText("Jo‘nash shahri"), { target: { value: "Toshkent" } });
  fireEvent.change(screen.getByPlaceholderText("Borish shahri"), { target: { value: "Samarqand" } });
  fireEvent.change(screen.getByPlaceholderText("Masalan: 100000"), { target: { value: "150000" } });
  const submit = screen.getByRole("button", { name: "E’lon joylashtirish" });
  await waitFor(() => expect(submit.disabled).toBe(false)); // waits for the cars to load
  fireEvent.click(submit);
}

describe("Create ad page: driver", () => {
  it("posts the ad with the chosen car and shows 'posted' when it was saved right away", async () => {
    const api = server();
    renderWithApp(<CreateAdPage />);
    await fillAndSubmit();

    expect(await screen.findByRole("alertdialog", { name: "E’loningiz joylashtirildi" })).toBeTruthy();
    expect(api.posted()).toEqual([
      expect.objectContaining({
        role: "driver",
        from: "Toshkent",
        to: "Samarqand",
        price: 150000, // a number, not the input's text
        seats: 3,
        vehicleId: 7,
        carModel: "Cobalt (oq)",
        allowLuggage: true,
      }),
    ]);
    expect(api.posted()[0]).not.toHaveProperty("allowGroupJoin");
  });

  it("shows 'accepted, the bot will confirm' when the server queued the ad", async () => {
    server({ postAnswer: [201, { success: true, queued: true }] });
    renderWithApp(<CreateAdPage />);
    await fillAndSubmit();
    expect(await screen.findByRole("alertdialog", { name: "E’loningiz qabul qilindi" })).toBeTruthy();
  });

  it.each([
    ["VEHICLE_NOT_FOUND", "Avtomobil topilmadi"],
    ["AD_DUPLICATE", "Bu vaqtda e’loningiz bor"],
    ["AD_TOO_CLOSE", "Vaqt juda yaqin"],
    ["AD_IN_PAST", "Bu vaqt o‘tib ketgan"],
  ])("shows its own popup when the server refuses with %s, never a success", async (code, title) => {
    server({ postAnswer: [201, { success: false, code, message: code }] });
    renderWithApp(<CreateAdPage />);
    await fillAndSubmit();
    expect(await screen.findByRole("alertdialog", { name: title })).toBeTruthy();
    expect(screen.queryByText("E’loningiz joylashtirildi")).toBeNull();
  });

  it("asks to check the form on a validation error (400), and shows a generic error otherwise", async () => {
    server({ postAnswer: [400, { message: ["price must be a positive number"] }] });
    const first = renderWithApp(<CreateAdPage />);
    await fillAndSubmit();
    expect(await screen.findByRole("alertdialog", { name: "Ma’lumotlarni tekshiring" })).toBeTruthy();
    first.unmount();

    server({ postAnswer: [500, {}] });
    renderWithApp(<CreateAdPage />);
    await fillAndSubmit();
    expect(await screen.findByRole("alertdialog", { name: "E’lon joylanmadi" })).toBeTruthy();
  });

  it("shows no popup of its own when the session expired (the session popup covers it)", async () => {
    fakeServer((config) => {
      if (config.url === "/vehicle") return [200, [cobalt]];
      if (config.url === "/auth/telegram") return [401, { message: "Telegram initData has expired" }];
      return [401, { message: "Invalid or expired token" }];
    });
    renderWithApp(<CreateAdPage />);
    await fillAndSubmit();
    await waitFor(() => expect(useSessionStore.getState().expired).toBe(true));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("can't post without a saved car, and says why", async () => {
    server({ vehicles: [] });
    renderWithApp(<CreateAdPage />);
    expect(await screen.findByText("Sizda saqlangan avtomobil topilmadi")).toBeTruthy();
    expect(screen.getByRole("button", { name: "E’lon joylashtirish" }).disabled).toBe(true);
  });

  it("keeps the seat count between 1 and 8", async () => {
    server();
    renderWithApp(<CreateAdPage />);
    const more = await screen.findByRole("button", { name: "Oshirish" });
    for (let i = 0; i < 10; i++) fireEvent.click(more);
    expect(screen.getByText("8 ta o‘rin")).toBeTruthy();
    expect(more.disabled).toBe(true);

    const less = screen.getByRole("button", { name: "Kamaytirish" });
    for (let i = 0; i < 10; i++) fireEvent.click(less);
    expect(screen.getByText("1 ta o‘rin")).toBeTruthy();
    expect(less.disabled).toBe(true);
  });
});

describe("Create ad page: passenger", () => {
  it("posts without a car and sends whether others may join", async () => {
    const api = server({ vehicles: [] });
    renderWithApp(<CreateAdPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Yo‘lovchiman" }));
    fireEvent.click(screen.getByRole("switch", { name: "Boshqa yo‘lovchilar qo‘shilishi" })); // turn group joining off
    await fillAndSubmit();

    expect(await screen.findByRole("alertdialog", { name: "E’loningiz joylashtirildi" })).toBeTruthy();
    const [ad] = api.posted();
    expect(ad).toMatchObject({ role: "passenger", allowGroupJoin: false, price: 150000 });
    expect(ad).not.toHaveProperty("vehicleId");
    expect(ad).not.toHaveProperty("allowLuggage");
  });
});

describe("Create ad page: date, departure and arrival", () => {
  // Saturday 28 November 2026, 10:20 in Tashkent
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-28T05:20:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const tile = (label) => screen.getByRole("button", { name: new RegExp(`^${label}`) });
  const finishAnimation = () => fireEvent.animationEnd(screen.getByRole("dialog"));
  const closed = () => waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

  async function pickDate(name) {
    fireEvent.click(tile("Jo‘nash kuni"));
    fireEvent.click(await screen.findByRole("button", { name }));
    finishAnimation();
    await closed();
  }
  async function pickTime(tileLabel, h, m) {
    fireEvent.click(tile(tileLabel));
    fireEvent.click(await screen.findByRole("button", { name: `Soat ${h}` }));
    fireEvent.click(screen.getByRole("button", { name: `${m} daqiqa` }));
    fireEvent.click(screen.getByRole("button", { name: "Tayyor" }));
    finishAnimation();
    await closed();
  }

  it("starts today at the next full hour, arriving 2 hours later", async () => {
    server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");
    expect(tile("Jo‘nash kuni").textContent).toContain("Bugun, 28-noy");
    expect(tile("Jo‘nash vaqti").textContent).toContain("11:00");
    expect(tile("Yetib borish vaqti").textContent).toContain("13:00");
    expect(tile("Yetib borish vaqti").textContent).toContain("2 soat");
  });

  it("posts the chosen day, departure and arrival; the arrival follows a new departure", async () => {
    const api = server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");

    await pickDate(/Ertaga/);
    await pickTime("Yetib borish vaqti", "16", "30"); // 11:00 → 16:30: 5 h 30 min
    expect(tile("Yetib borish vaqti").textContent).toContain("5 soat 30 daq");
    await pickTime("Jo‘nash vaqti", "06", "15"); // the trip length stays
    expect(tile("Yetib borish vaqti").textContent).toContain("11:45");

    await fillAndSubmit();
    await waitFor(() => expect(api.posted()).toHaveLength(1));
    expect(api.posted()[0]).toMatchObject({
      date: "2026-11-29",
      time: "06:15",
      calculatedArrivalTime: "11:45",
      estimatedDurationHours: 5,
      estimatedDurationMinutes: 30,
    });
  });

  it("an arrival earlier than the departure is the next day", async () => {
    const api = server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");

    await pickTime("Jo‘nash vaqti", "22", "00");
    fireEvent.click(tile("Yetib borish vaqti"));
    fireEvent.click(await screen.findByRole("button", { name: "Soat 01" }));
    fireEvent.click(screen.getByRole("button", { name: "15 daqiqa" }));
    expect(screen.getByText("Yo‘lda: 3 soat 15 daq · ertasi kuni")).toBeTruthy(); // live, inside the sheet
    fireEvent.click(screen.getByRole("button", { name: "Tayyor" }));
    finishAnimation();
    await closed();
    expect(tile("Yetib borish vaqti").textContent).toContain("01:15(Ertasi kuni)");

    await fillAndSubmit();
    await waitFor(() => expect(api.posted()).toHaveLength(1));
    expect(api.posted()[0]).toMatchObject({ time: "22:00", calculatedArrivalTime: "01:15", estimatedDurationHours: 3, estimatedDurationMinutes: 15 });
  });

  it("won't take an arrival equal to the departure", async () => {
    server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");
    fireEvent.click(tile("Yetib borish vaqti"));
    fireEvent.click(await screen.findByRole("button", { name: "Soat 11" }));
    fireEvent.click(screen.getByRole("button", { name: "00 daqiqa" }));
    expect(screen.getByText("Jo‘nash vaqti bilan bir xil bo‘lmasin")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tayyor" }).disabled).toBe(true);
  });

  it("today, only times after now can be chosen", async () => {
    server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");
    fireEvent.click(tile("Jo‘nash vaqti"));
    expect((await screen.findByRole("button", { name: "Soat 09" })).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Soat 10" }));
    expect(screen.getByRole("button", { name: "20 daqiqa" }).disabled).toBe(true); // 10:20 is now
    expect(screen.getByRole("button", { name: "25 daqiqa" }).disabled).toBe(false);
  });

  it("moves a departure that has passed to the next hour when the day changes to today", async () => {
    server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");
    await pickDate(/Ertaga/);
    await pickTime("Jo‘nash vaqti", "07", "00");
    await pickDate(/Bugun/);
    expect(tile("Jo‘nash vaqti").textContent).toContain("11:00");
  });

  it("passengers choose a day and time only", async () => {
    const api = server({ vehicles: [] });
    renderWithApp(<CreateAdPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Yo‘lovchiman" }));
    expect(screen.queryByRole("button", { name: /^Yetib borish vaqti/ })).toBeNull();
    await fillAndSubmit();
    await waitFor(() => expect(api.posted()).toHaveLength(1));
    expect(api.posted()[0]).not.toHaveProperty("calculatedArrivalTime");
  });
});
