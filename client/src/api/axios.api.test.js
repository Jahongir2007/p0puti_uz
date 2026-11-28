import { beforeEach, describe, expect, it } from "vitest";
import api from "./axios.api";
import { useAuthStore } from "../stores/auth.store";
import { useSessionStore } from "../stores/session.store";
import { authHeader, fakeServer } from "../test/http";
import { fakeTelegram } from "../test/telegram";

const loginOk = [201, { user: { success: true, data: { user: { id: "1" }, accessToken: "new-token" } } }];

beforeEach(() => {
  fakeTelegram();
  useAuthStore.setState({ user: null, accessToken: "old-token" });
  useSessionStore.setState({ expired: false });
});

// A protected endpoint that only accepts the new token
const protectedRoute = (loginAnswer) => (config) => {
  if (config.url === "/auth/telegram") return loginAnswer;
  return authHeader(config) === "Bearer new-token" ? [200, { success: true }] : [401, { message: "Invalid or expired token" }];
};

describe("expired login token", () => {
  it("logs in again with Telegram's data and retries the request once with the new token", async () => {
    const requests = fakeServer(protectedRoute(loginOk));
    const res = await api.get("/ad/latest", { headers: { Authorization: "Bearer old-token" } });

    expect(res.data).toEqual({ success: true });
    expect(requests.map((r) => r.url)).toEqual(["/ad/latest", "/auth/telegram", "/ad/latest"]);
    expect(JSON.parse(requests[1].data)).toEqual({ initData: "fake-init-data" });
    expect(useAuthStore.getState().accessToken).toBe("new-token");
  });

  it("logs in only once when several requests expire at the same time", async () => {
    const requests = fakeServer(protectedRoute(loginOk));
    const old = { headers: { Authorization: "Bearer old-token" } };
    await Promise.all([api.get("/ad/latest", old), api.get("/vehicle", old), api.get("/ad/user", old)]);
    expect(requests.filter((r) => r.url === "/auth/telegram")).toHaveLength(1);
  });

  it("shows the session-expired popup when logging in again is refused too", async () => {
    fakeServer(protectedRoute([401, { message: "Telegram initData has expired" }]));
    const error = await api.get("/ad/latest", { headers: { Authorization: "Bearer old-token" } }).catch((e) => e);
    expect(error.sessionExpired).toBe(true);
    expect(useSessionStore.getState().expired).toBe(true);
  });

  it("does not call it an expired session when the network failed", async () => {
    fakeServer(protectedRoute([503, {}]));
    const error = await api.get("/ad/latest", { headers: { Authorization: "Bearer old-token" } }).catch((e) => e);
    expect(error.sessionExpired).toBeUndefined();
    expect(useSessionStore.getState().expired).toBe(false);
  });

  it("never retries the login request itself (no endless loop)", async () => {
    const requests = fakeServer(() => [401, {}]);
    await api.post("/auth/telegram", { initData: "x" }).catch(() => {});
    expect(requests).toHaveLength(1);
  });

  it("leaves other errors alone", async () => {
    const requests = fakeServer(() => [500, {}]);
    await expect(api.get("/ad/latest")).rejects.toMatchObject({ response: { status: 500 } });
    expect(requests).toHaveLength(1);
  });
});
