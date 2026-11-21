import { create } from "zustand";

// Set by the axios interceptor (outside React) when the token expired and
// logging in again failed; read by <SessionExpiredModal /> to show the popup.
export const useSessionStore = create((set) => ({
  expired: false,
  markExpired: () => set({ expired: true }),
}));
