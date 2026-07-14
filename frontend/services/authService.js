import axios from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured.");
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

export async function register(payload) {
  const { data } = await apiClient.post("/api/auth/register", payload);
  return data;
}

export async function verifyEmail(accessToken) {
  const { data } = await apiClient.post("/api/auth/verify-email", { access_token: accessToken });
  return data;
}

// ----- US-003 -----
export async function resendVerification(email) {
  const { data } = await apiClient.post("/api/auth/resend-verification", { email });
  return data;
}

// ----- US-004 / US-005 -----
export async function login(payload) {
  const { data } = await apiClient.post("/api/auth/login", payload);
  return data;
}

export async function refreshToken(refreshToken) {
  const { data } = await apiClient.post("/api/auth/refresh", { refresh_token: refreshToken });
  return data;
}

// ----- US-006 -----
export async function forgotPassword(email) {
  const { data } = await apiClient.post("/api/auth/forgot-password", { email });
  return data;
}

export function getApiErrorMessage(error, fallbackMessage) {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail[0]?.msg || fallbackMessage;
  }
  return detail || fallbackMessage;
}