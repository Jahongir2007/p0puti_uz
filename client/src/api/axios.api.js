import axios from "axios";
import { useAuthStore } from "../stores/auth.store";
import i18n from "../i18n";

const tg = window.Telegram?.WebApp;
let sessionExpiredShown = false;

function showSessionExpired(){
  if(sessionExpiredShown) return;
  sessionExpiredShown = true;

  const message = i18n.t("sessionExpired");
  if(tg?.isVersionAtLeast?.("6.2")){
    tg.showAlert(message, () => tg.close());
  }else{
    window.alert(message);
  }
}

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

let logInProgress = null;

async function LoginAgain(){
  const initData = window.Telegram?.WebApp?.initData;
  const res = await api.post("/auth/telegram", { initData });
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
    let token;
    try{
      token = await logInProgress;
    }catch(loginError){
      if(loginError.response?.status === 401){
        error.sessionExpired = true;
        showSessionExpired();
      }
      throw error;
    }
    
    request.headers.Authorization = `Bearer ${token}`;
    return api(request);
  } 
);
export default api;