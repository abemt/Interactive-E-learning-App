import axios from "axios";
import { getAuthToken, getAuthUser, setAuthSession } from "./authStorage";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (status === 403 && code === "PASSWORD_CHANGE_REQUIRED") {
      const token = getAuthToken();
      const user = getAuthUser();

      if (token && user && !user.needsPasswordChange) {
        setAuthSession({
          token,
          user: {
            ...user,
            needsPasswordChange: true
          }
        });
      }

      if (typeof window !== "undefined" && window.location.pathname !== "/change-password") {
        window.location.assign("/change-password");
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
