import api from "./axios.api";
import { useAuthStore } from "../stores/auth.store";

export async function authenticateTelegram() {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) throw new Error("Ilovani Telegram ichida oching"); // opened outside Telegram

  const response = await api.post("/auth/telegram", { initData });

  if(response.status === 401){
    await authenticateTelegram();
  }

  const { user: authUser, accessToken } = response.data.user.data; // same path you already use

  useAuthStore.getState().setAuth(authUser, accessToken);

  return authUser; // ← the user object, so useMe().data.id works
}