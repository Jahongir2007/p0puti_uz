import axios from "axios";
import { useAuthStore } from "../stores/auth.store";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

let logInProgress = null;

async function LoginAgain(){
  const initData = window.Telegram?.WebApp?.initData;
  const res = await api.post("auth/telegram", { initData });
  const { user, accessToken } = res.data.user.data;
  useAuthStore.getState().setAuth(user, accessToken);
  return accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const request = error.config;
    const is401 = error.response?.status === 401;
    const isLoginCall = request?.url?.includes("/auth/telegram");

    if(!is401 || isLoginCall || request._retried) throw error;

    request._retried = true;
    logInProgress ??= LoginAgain().finally(() => (logInProgress = null));
    const token = await loginInProgress;
    
    request.headers.Authorization = `Bearer ${token}`;
    return api(request);
  } 
);
export default api;