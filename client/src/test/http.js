import { AxiosError } from "axios";
import { vi } from "vitest";
import api from "../api/axios.api";

// Replaces the network for the shared axios instance. `route(config)` returns [status, body].
// Non-2xx answers reject like real axios does, so the interceptor and error handling run for real.
export function fakeServer(route) {
  const requests = [];
  api.defaults.adapter = vi.fn(async (config) => {
    requests.push(config);
    const [status, data] = await route(config);
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response);
  });
  return requests;
}

export const authHeader = (config) =>
  config.headers?.get?.("Authorization") ?? config.headers?.Authorization;
