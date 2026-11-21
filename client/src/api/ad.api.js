import api from "./axios.api";
import { useAuthStore } from "../stores/auth.store";

export async function postTelegramUserAd(adData) {
  try {
    const accessToken = useAuthStore.getState().accessToken;

    // alert(
    //     `Base URL: ${api.defaults.baseURL}\n` +
    //     `Path: /ad`
    // );

    // const body = JSON.stringify(adData, null, 2);
    // alert(body);

    const response = await api.post("/ad", adData, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    // alert(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    // alert(`CATCH ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

export async function getLatestAds(cursor, limit) {
  try {

    // alert(
    //     `Base URL: ${api.defaults.baseURL}\n` +
    //     `Path: /ad/latest\n` +
    //     `Query Params: cursor=${cursor}, limit=${limit}`
    // );
    const accessToken = useAuthStore.getState().accessToken;
    const response = await api.get("/ad/latest", {
      params: { cursor, limit },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // alert(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    // alert(`CATCH ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
}

export async function getAdById(id){
  try{
    // alert(
    //     `Base URL: ${api.defaults.baseURL}\n` +
    //     `Path: /ad/${id}`
    //     // `Query Params: cursor=${cursor}, limit=${limit}`
    // );
    const accessToken = useAuthStore.getState().accessToken;
    const { data } = await api.get(`/ad/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return data.data;
  }catch(err){
    // alert(`CATCH ${JSON.stringify(err, null, 2)}`);
    throw err;
  }
}

export const searchAds = async ({ from, to, date, passengers, type, cursor, limit = 10 }) => {
  try {
    const accessToken = useAuthStore.getState().accessToken;
    const { data } = await api.get("/ad/search", {
      params: { from, to, date, passengers, type, cursor, limit },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!data.success) throw new Error(data.error ?? "Qidiruvda xatolik");
    return data; // { items: [...], nextCursor: string | null }
  } catch (err) {
    // alert(
    //   `CATCH: ${err.message}\n` +
    //   `Status: ${err.response?.status}\n` +
    //   `Response: ${JSON.stringify(err.response?.data)}`
    // );
    throw err;
  }
};

export const getTelegramUserAds = async ({cursor, limit = 10}) => {
  try{
    const accessToken = useAuthStore.getState().accessToken;
    const { data } = await api.get("/ad/user", {
      params: { cursor, limit },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if(!data.success) throw new Error(data?.error ?? "Foydalanuvchi e'lonlarini olishda xatolik yuz berdi");
    return data;
  }catch(err){
    // alert(
    //   `CATCH: ${err.message}\n` +
    //   `Status: ${err.response?.status}\n` +
    //   `Response: ${JSON.stringify(err.response?.data)}`
    // );
    throw err;
  }
}

export const deleteTelegramUserAd = async (adId) => {
  const accessToken = useAuthStore.getState().accessToken;
  const { data } = await api.delete(`/ad/${adId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!data.success) throw new Error(data?.error ?? "DELETE_AD_FAILED");
  return data;
};

export const updateTelegramUserAd = async (adId, payload) => {
  const accessToken = useAuthStore.getState().accessToken;
  const { data } = await api.patch(`/ad/${adId}`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!data.success) throw new Error(data?.error ?? "UPDATE_AD_FAILED");
  return data;
};