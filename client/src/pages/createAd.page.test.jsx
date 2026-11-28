import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

  async function pickDuration(h, m) {
    fireEvent.click(tile("Yo‘l davomiyligi"));
    fireEvent.click(within(await screen.findByRole("spinbutton", { name: "Soatlar" })).getByText(h));
    fireEvent.click(within(screen.getByRole("spinbutton", { name: "Daqiqalar" })).getByText(m));
    fireEvent.click(screen.getByRole("button", { name: "Tayyor" }));
    finishAnimation();
    await closed();
  }

  it("starts today at the next full hour, with a 2-hour trip arriving at 13:00", async () => {
    server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");
    expect(tile("Jo‘nash kuni").textContent).toContain("Bugun, 28-noy");
    expect(tile("Jo‘nash vaqti").textContent).toContain("11:00");
    expect(tile("Yo‘l davomiyligi").textContent).toContain("2 soat");
    expect(tile("Yo‘l davomiyligi").textContent).toContain("13:00");
  });

  it("the driver gives the trip length; the app works out the arrival and posts it", async () => {
    const api = server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");

    await pickDate(/Ertaga/);
    await pickDuration("5", "30");
    expect(tile("Yo‘l davomiyligi").textContent).toContain("5 soat 30 daq");
    expect(tile("Yo‘l davomiyligi").textContent).toContain("16:30"); // 11:00 + 5:30
    await pickTime("Jo‘nash vaqti", "06", "15");
    expect(tile("Yo‘l davomiyligi").textContent).toContain("11:45"); // the arrival follows the departure

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

  it("a trip past midnight arrives the next day", async () => {
    const api = server();
    renderWithApp(<CreateAdPage />);
    await screen.findByPlaceholderText("Jo‘nash shahri");

    await pickTime("Jo‘nash vaqti", "22", "00");
    await pickDuration("3", "15");
    expect(tile("Yo‘l davomiyligi").textContent).toContain("01:15(Ertasi kuni)");

    await fillAndSubmit();
    await waitFor(() => expect(api.posted()).toHaveLength(1));
    expect(api.posted()[0]).toMatchObject({ time: "22:00", calculatedArrivalTime: "01:15", estimatedDurationHours: 3, estimatedDurationMinutes: 15 });
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
    expect(screen.queryByRole("button", { name: /^Yo‘l davomiyligi/ })).toBeNull();
    await fillAndSubmit();
    await waitFor(() => expect(api.posted()).toHaveLength(1));
    expect(api.posted()[0]).not.toHaveProperty("calculatedArrivalTime");
  });
});
