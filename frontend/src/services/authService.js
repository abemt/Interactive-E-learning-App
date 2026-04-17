import apiClient from "./apiClient";

export async function loginUser(credentials) {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data;
}

export async function registerUser(payload) {
  const response = await apiClient.post("/auth/register", payload);
  return response.data;
}

export async function changePassword(payload) {
  const response = await apiClient.post("/auth/change-password", payload);
  return response.data;
}
