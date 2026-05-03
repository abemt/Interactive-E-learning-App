import axios from "axios";
import { getAuthUser, setAuthSession } from "./authStorage";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (status === 403 && code === "PASSWORD_CHANGE_REQUIRED") {
      const user = getAuthUser();

      if (user && !user.needsPasswordChange) {
        setAuthSession({
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
