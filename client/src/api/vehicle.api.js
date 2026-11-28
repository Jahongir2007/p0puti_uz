import api from "./axios.api";
import { useAuthStore } from "../stores/auth.store";

// The vehicle endpoints answer 200/201 with { success: false, code } when they refuse.
// Throw so the page's onError runs instead of onSuccess.
function failIfRefused(data) {
  if (data?.success !== false) return data;
  const error = new Error(data.data?.message ?? "VEHICLE_REQUEST_FAILED");
  error.serverCode = data.code; // e.g. PLATE_TAKEN
  throw error;
}

export async function getTelegramUserVehicles() {
    const accessToken = useAuthStore.getState().accessToken;

    // alert(
    //     accessToken
    //         ? "🔑 Token exists"
    //         : "❌ NO TOKEN"
    // );

    // alert(
    //     `Base URL: ${api.defaults.baseURL}\n` +
    //     `Path: /vehicle`
    // );

    try {
        // alert("🚀 About to send request");

        const response = await api.get("/vehicle", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        // alert("✅ Response received");

        // alert(JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        // alert(
        //     "❌ REQUEST FAILED\n\n" +
        //     String(error)
        // );

        // console.error("REQUEST ERROR:", error);
        // console.error("Response:", error.response);
        // console.error("Request:", error.request);

        throw error;
    }
}

export async function createTelegramUserVehicle(vehicleData) {
  const accessToken = useAuthStore.getState().accessToken;

    // alert(
    //     accessToken
    //         ? "🔑 Token exists"
    //         : "❌ NO TOKEN"
    // );

    // alert(
    //     `Base URL: ${api.defaults.baseURL}\n` +
    //     `Path: /vehicle`
    // );

    // alert(`Body: ${JSON.stringify(vehicleData, null, 2)}`);

    try{
        // alert("🚀 About to send request");
        
        const response = await api.post(
            "/vehicle",
            vehicleData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        // alert("✅ Response received");

        // alert(JSON.stringify(response.data, null, 2));

        return failIfRefused(response.data);
    }catch(error){
        // alert(
        //     "❌ REQUEST FAILED\n\n" +
        //     String(error)
        // );
        throw error;
    }
}

export async function updateTelegramUserVehicle(vehicleId, vehicleData){
    const accessToken = useAuthStore.getState().accessToken;

    // alert(
    //     accessToken
    //         ? "🔑 Token exists"
    //         : "❌ NO TOKEN"
    // );

    // alert(
    //     `Base URL: ${api.defaults.baseURL}\n` +
    //     `Path: /vehicle/${vehicleId}`
    // );

    // alert(`Body: ${JSON.stringify(vehicleData, null, 2)}`);

    try{
        const response = await api.patch(
            `/vehicle/${vehicleId}`,
            vehicleData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        // alert("✅ Response received");

        // alert(JSON.stringify(response.data, null, 2));

        return failIfRefused(response.data);
    }catch(error){
        // alert(
        //     "❌ REQUEST FAILED\n\n" +
        //     String(error)
        // );
        throw error;
    }
}

export async function deleteTelegramUserVehicle(vehicleId){
    const accessToken = useAuthStore.getState().accessToken;

    // alert(
    //     accessToken
    //         ? "🔑 Token exists"
    //         : "❌ NO TOKEN"
    // );

    // alert(
    //     `Base URL: ${api.defaults.baseURL}\n` +
    //     `Path: /vehicle/${vehicleId}`
    // );

    // alert(`Body: ${JSON.stringify(vehicleData, null, 2)}`);

    try{
        const response = await api.delete(
            `/vehicle/${vehicleId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        // alert("✅ Response received");

        // alert(JSON.stringify(response.data, null, 2));

        return failIfRefused(response.data);
    }catch(error){
        // alert(
        //     "❌ REQUEST FAILED\n\n" +
        //     String(error)
        // );
        throw error;
    }
}