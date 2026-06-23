import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api/v1",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        return api(original);
      } catch {
        useAuthStore.getState().clear();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Lazy import to avoid circular dep at module init time
let useAuthStore: any;
import("../store/auth").then((m) => { useAuthStore = m.useAuthStore; });
