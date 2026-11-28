import { beforeEach, describe, expect, it } from "vitest";
import { deleteTelegramUserAd, postTelegramUserAd, searchAds, updateTelegramUserAd } from "./ad.api";
import { createTelegramUserVehicle, deleteTelegramUserVehicle, updateTelegramUserVehicle } from "./vehicle.api";
import { useAuthStore } from "../stores/auth.store";
import { authHeader, fakeServer } from "../test/http";

beforeEach(() => useAuthStore.setState({ accessToken: "token" }));

describe("ads API", () => {
  it("sends the token and returns the server's answer for a posted ad", async () => {
    const requests = fakeServer(() => [201, { success: true, queued: false, data: { id: "9" } }]);
    await expect(postTelegramUserAd({ role: "driver" })).resolves.toEqual({ success: true, queued: false, data: { id: "9" } });
    expect(authHeader(requests[0])).toBe("Bearer token");
  });

  it("throws with the server's code when the ad is refused (the page then shows the right sheet)", async () => {
    fakeServer(() => [201, { success: false, code: "VEHICLE_NOT_FOUND", message: "Vehicle not found" }]);
    await expect(postTelegramUserAd({})).rejects.toMatchObject({ serverCode: "VEHICLE_NOT_FOUND", message: "Vehicle not found" });
  });

  it("lets validation errors (400) through as HTTP errors", async () => {
    fakeServer(() => [400, { message: [] }]);
    await expect(postTelegramUserAd({})).rejects.toMatchObject({ response: { status: 400 } });
  });

  it("sends the seat count as `passenger`, the name the server reads", async () => {
    const requests = fakeServer(() => [200, { success: true, data: [], nextCursor: null }]);
    await searchAds({ from: "A", to: "B", date: "2026-12-05", passengers: 3, type: "DRIVER" });
    expect(requests[0].params).toMatchObject({ passenger: 3, type: "DRIVER" });
    expect(requests[0].params.passengers).toBeUndefined();
  });

  it("throws with AD_NOT_FOUND / AD_DEPARTED codes on refused edits and cancellations", async () => {
    fakeServer(() => [200, { success: false, code: "AD_DEPARTED", message: "Ad has already departed" }]);
    await expect(updateTelegramUserAd("1", { price: 1, seats: 1 })).rejects.toMatchObject({ serverCode: "AD_DEPARTED" });
    fakeServer(() => [200, { success: false, code: "AD_NOT_FOUND", message: "Ad not found" }]);
    await expect(deleteTelegramUserAd("1")).rejects.toMatchObject({ serverCode: "AD_NOT_FOUND" });
  });
});

describe("vehicles API", () => {
  it("returns the new car", async () => {
    fakeServer(() => [201, { id: "7", plateNumber: "01A123BC" }]);
    await expect(createTelegramUserVehicle({ plateNumber: "01A123BC" })).resolves.toEqual({ id: "7", plateNumber: "01A123BC" });
  });

  it("throws PLATE_TAKEN for add and edit, instead of treating it as success", async () => {
    const taken = [201, { success: false, code: "PLATE_TAKEN", data: { message: "This plate number is already exists" } }];
    fakeServer(() => taken);
    await expect(createTelegramUserVehicle({})).rejects.toMatchObject({ serverCode: "PLATE_TAKEN" });
    await expect(updateTelegramUserVehicle("7", {})).rejects.toMatchObject({ serverCode: "PLATE_TAKEN" });
  });

  it("throws when deleting a car that isn't yours", async () => {
    fakeServer(() => [200, { success: false, data: { message: "User vehicle is not found" } }]);
    await expect(deleteTelegramUserVehicle("7")).rejects.toThrow("User vehicle is not found");
  });
});
