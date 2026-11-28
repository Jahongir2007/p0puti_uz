import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

// The page and its helpers read window.Telegram once, when they load: fake it before the imports run
const tg = vi.hoisted(() => {
  const tg = {
    initData: "fake-init-data",
    initDataUnsafe: { user: { id: 1, first_name: "Ali", last_name: "Valiyev", username: "ali" } },
    isVersionAtLeast: () => true,
    ready: vi.fn(),
    showConfirm: vi.fn(),
    openTelegramLink: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
  };
  window.Telegram = { WebApp: tg };
  return tg;
});

import i18n from "../i18n";
import ProfilePage from "./profile.page";
import { useAuthStore } from "../stores/auth.store";
import { fakeServer } from "../test/http";
import { renderWithApp } from "../test/render";

const cobalt = { id: "7", brand: "Chevrolet", model: "Cobalt", color: "Oq", plateNumber: "01 a 777 aa" };
const me = { id: "1", createdAt: "2026-09-10T08:00:00Z" };
const refused = (code, message) => [200, { success: false, code, data: { message } }];

// A small fake backend. `answers` overrides one route, e.g. { "post /vehicle": [500, {}] }
function server({ vehicles = [cobalt], ads = { data: [], nextCursor: null }, answers = {} } = {}) {
  const cars = [...vehicles];
  const requests = fakeServer((config) => {
    const route = `${config.method} ${config.url.replace(/\/\d+$/, "/:id")}`;
    if (answers[route]) return typeof answers[route] === "function" ? answers[route](config) : answers[route];
    switch (route) {
      case "post /auth/telegram":
        return [201, { user: { success: true, data: { user: me, accessToken: "token" } } }];
      case "get /vehicle":
        return [200, cars];
      case "get /ad/user":
        return [200, { success: true, ...ads }];
      case "post /vehicle": {
        const car = { id: "8", ...JSON.parse(config.data) };
        cars.push(car);
        return [201, car];
      }
      case "patch /vehicle/:id":
        return [200, { id: "7", ...JSON.parse(config.data) }];
      case "delete /vehicle/:id":
        cars.splice(0, 1);
        return [200, { success: true }];
      default:
        throw new Error(`Unexpected request: ${route}`);
    }
  });
  const sent = (route) =>
    requests.filter((r) => `${r.method} ${r.url.replace(/\/\d+$/, "/:id")}` === route);
  return { requests, sent };
}

function renderPage() {
  const onNavigate = vi.fn();
  renderWithApp(<ProfilePage onNavigate={onNavigate} />);
  return onNavigate;
}

// Opens the add form and fills it in
async function fillCarForm({ brand = "Chevrolet", model = "Gentra (Lacetti)", color = "  Qora ", plate = " 01 a  123 bc " } = {}) {
  fireEvent.click(await screen.findByRole("button", { name: "Avtomobil qo‘shish" }));
  fireEvent.change(screen.getByDisplayValue("Markani tanlang"), { target: { value: brand } });
  fireEvent.change(screen.getByDisplayValue("Modelni tanlang"), { target: { value: model } });
  fireEvent.change(screen.getByPlaceholderText("Rang (Masalan: Oq, Qora)"), { target: { value: color } });
  fireEvent.change(screen.getByPlaceholderText("Davlat raqami (01 A 777 AA)"), { target: { value: plate } });
  fireEvent.click(screen.getByRole("button", { name: "Avtomobilni saqlash" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.Telegram = { WebApp: tg }; // logging in reads it on every call; the shared cleanup removes it
  useAuthStore.setState({ user: null, accessToken: null });
  vi.spyOn(console, "error").mockImplementation(() => {}); // the page logs failed car requests
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => i18n.changeLanguage("uz"));

describe("Profile page: who you are", () => {
  it("shows the Telegram name and real numbers: cars, active ads (10+ when there are more) and join date", async () => {
    server({ ads: { data: Array.from({ length: 10 }, (_, i) => ({ id: i })), nextCursor: "10" } });
    renderPage();

    expect(await screen.findByText("Ali Valiyev")).toBeTruthy();
    expect(screen.getByText("@ali")).toBeTruthy();
    expect(screen.getByText("AV")).toBeTruthy(); // initials, no photo
    expect(await screen.findByText("10+")).toBeTruthy();
    expect(screen.getByText("sen 2026")).toBeTruthy();
    const carsStat = screen.getByText("Avtomobillar").previousSibling;
    await waitFor(() => expect(carsStat.textContent).toBe("1"));
  });

  it("shows the error screen with a retry when logging in fails", async () => {
    let attempts = 0;
    server({ answers: { "post /auth/telegram": () => (++attempts === 1 ? [500, {}] : [201, { user: { success: true, data: { user: me, accessToken: "t" } } }]) } });
    renderPage();

    expect(await screen.findByText("Ma'lumotlarni yuklab bo'lmadi")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Qaytadan urinish" }));
    expect(await screen.findByText("Ali Valiyev")).toBeTruthy();
  });
});

describe("Profile page: cars", () => {
  it("adds a car with a tidied plate and colour, then shows it in the list", async () => {
    const api = server();
    renderPage();
    await fillCarForm();

    expect(await screen.findByText("Chevrolet Gentra (Lacetti)")).toBeTruthy();
    expect(JSON.parse(api.sent("post /vehicle")[0].data)).toEqual({
      brand: "Chevrolet",
      model: "Gentra (Lacetti)",
      color: "Qora",
      plateNumber: "01 A 123 BC",
    });
    expect(screen.queryByRole("button", { name: "Avtomobilni saqlash" })).toBeNull(); // the form closed
  });

  it("says the plate is taken instead of pretending the car was saved", async () => {
    server({ answers: { "post /vehicle": refused("PLATE_TAKEN", "This plate number is already exists") } });
    renderPage();
    await fillCarForm();

    expect(await screen.findByRole("alertdialog", { name: "Bu raqam band" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Avtomobilni saqlash" })).toBeTruthy(); // the form stays to fix it
  });

  it("shows a generic error when adding fails for another reason", async () => {
    server({ answers: { "post /vehicle": [500, {}] } });
    renderPage();
    await fillCarForm();
    expect(await screen.findByRole("alertdialog", { name: "Avtomobil qo‘shilmadi" })).toBeTruthy();
  });

  it("edits a car: the form starts with its data and sends the changes", async () => {
    const api = server();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Tahrirlash" }));
    expect(screen.getByDisplayValue("Chevrolet")).toBeTruthy();
    expect(screen.getByDisplayValue("Cobalt")).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("Oq"), { target: { value: "Kumush" } });
    fireEvent.click(screen.getByRole("button", { name: "O‘zgarishlarni saqlash" }));

    await waitFor(() => expect(api.sent("patch /vehicle/:id")).toHaveLength(1));
    const [patch] = api.sent("patch /vehicle/:id");
    expect(patch.url).toBe("/vehicle/7");
    expect(JSON.parse(patch.data)).toEqual({ brand: "Chevrolet", model: "Cobalt", color: "Kumush", plateNumber: "01 A 777 AA" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "O‘zgarishlarni saqlash" })).toBeNull());
  });

  it("says the plate is taken when an edit uses another car's plate", async () => {
    server({ answers: { "patch /vehicle/:id": refused("PLATE_TAKEN", "This plate number is already exists") } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Tahrirlash" }));
    fireEvent.click(screen.getByRole("button", { name: "O‘zgarishlarni saqlash" }));
    expect(await screen.findByRole("alertdialog", { name: "Bu raqam band" })).toBeTruthy();
  });

  it("deletes a car only after the user confirms", async () => {
    const api = server();
    renderPage();

    tg.showConfirm.mockImplementationOnce((message, answer) => answer(false));
    fireEvent.click(await screen.findByRole("button", { name: "O‘chirish" }));
    await waitFor(() => expect(tg.showConfirm).toHaveBeenCalledTimes(1));
    expect(api.sent("delete /vehicle/:id")).toHaveLength(0);

    tg.showConfirm.mockImplementationOnce((message, answer) => answer(true));
    fireEvent.click(screen.getByRole("button", { name: "O‘chirish" }));
    await waitFor(() => expect(api.sent("delete /vehicle/:id")).toHaveLength(1));
    expect(api.sent("delete /vehicle/:id")[0].url).toBe("/vehicle/7");
    await waitFor(() => expect(screen.queryByText("Chevrolet Cobalt")).toBeNull());
  });

  it("shows an error when deleting fails (e.g. the car isn't yours)", async () => {
    server({ answers: { "delete /vehicle/:id": refused(undefined, "User vehicle is not found") } });
    tg.showConfirm.mockImplementation((message, answer) => answer(true));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "O‘chirish" }));
    expect(await screen.findByRole("alertdialog", { name: "Avtomobil o‘chirilmadi" })).toBeTruthy();
  });

  it("offers a retry when the cars don't load", async () => {
    let calls = 0;
    server({ answers: { "get /vehicle": () => (++calls === 1 ? [500, {}] : [200, [cobalt]]) } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Qayta urinish" }));
    expect(await screen.findByText("Chevrolet Cobalt")).toBeTruthy();
  });

  it("hides the cars when driver mode is off", async () => {
    server();
    renderPage();
    expect(await screen.findByText("Chevrolet Cobalt")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: "Haydovchi rejimi" }));
    expect(screen.queryByText("Chevrolet Cobalt")).toBeNull();
    expect(screen.getByText("Faqat yo'lovchi sifatida")).toBeTruthy();
  });
});

describe("Profile page: settings", () => {
  it("switches the app to Russian and remembers it", async () => {
    server();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Ilova tili/ }));
    fireEvent.click(screen.getByRole("button", { name: /Русский/ }));

    await waitFor(() => expect(i18n.language).toBe("ru"));
    expect(localStorage.getItem("lang")).toBe("ru");
  });

  it("switches to the dark theme and remembers it", async () => {
    server();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Mavzu/ }));
    fireEvent.click(screen.getByRole("button", { name: /Qorong‘i/ }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(within(screen.getByRole("button", { name: /Mavzu/ })).getByText("Qorong‘i")).toBeTruthy();
  });

  it("opens my ads, and goes back home", async () => {
    server();
    const onNavigate = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Mening e'lonlarim/ }));
    expect(onNavigate).toHaveBeenCalledWith("userAds");
    fireEvent.click(screen.getByRole("button", { name: "Orqaga" }));
    expect(onNavigate).toHaveBeenCalledWith("home");
  });
});
