import axios from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be configured.");
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

// ─── Registration ────────────────────────────────────────────────────────────

export async function register(payload) {
  const { data } = await apiClient.post("/api/auth/register", payload);
  return data;
}

export async function candidateRegister(payload) {
  const { data } = await apiClient.post("/api/auth/candidate/register", payload);
  return data;
}

// ─── OTP Verification ────────────────────────────────────────────────────────

/**
 * Verify signup OTP.
 * @param {string} email
 * @param {string} otp  6-digit code
 */
export async function verifyOtp(email, otp) {
  const { data } = await apiClient.post("/api/auth/verify-otp", { email, otp });
  return data;
}

/**
 * Legacy alias — now routes to the OTP endpoint when email+otp are provided.
 * Kept so existing pages that import verifyEmail continue to work.
 */
export async function verifyEmail(email, otp) {
  return verifyOtp(email, otp);
}

// ─── Resend OTP ──────────────────────────────────────────────────────────────

export async function resendOtp(email) {
  const { data } = await apiClient.post("/api/auth/resend-otp", { email });
  return data;
}

/** Backward-compatible alias */
export async function resendVerification(email) {
  return resendOtp(email);
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(payload) {
  const { data } = await apiClient.post("/api/auth/login", payload);
  return data;
}

// ─── Logout ──────────────────────────────────────────────────────────────────

/**
 * US-008: Ask the server to revoke the session (refresh token) and record an audit log.
 * Best-effort — if the network call fails we still clear the local session.
 */
export async function logout(accessToken) {
  if (!accessToken) return;
  try {
    await apiClient.post(
      "/api/auth/logout",
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch {
    // Ignore — local session is cleared regardless by the caller.
  }
}

/** Clears every piece of session state stored in the browser. */
export function clearLocalSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("session_last_active");
}

// ─── Super Admin Bootstrap ───────────────────────────────────────────────────

export async function bootstrapSuperAdmin(payload) {
  const { data } = await apiClient.post("/api/auth/bootstrap-super-admin", payload);
  return data;
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

export async function refreshToken(refreshTokenValue) {
  const { data } = await apiClient.post("/api/auth/refresh", { refresh_token: refreshTokenValue });
  return data;
}

// ─── Forgot / Reset Password ─────────────────────────────────────────────────

/**
 * Send OTP to user's email for password reset.
 */
export async function forgotPassword(email) {
  const { data } = await apiClient.post("/api/auth/forgot-password", { email });
  return data;
}

/**
 * Reset password using OTP code.
 * @param {{ email: string, otp: string, password: string, confirm_password: string }} payload
 */
export async function resetPassword(payload) {
  const { data } = await apiClient.post("/api/auth/reset-password", payload);
  return data;
}

/**
 * Change password (authenticated user).
 * @param {{ current_password: string, new_password: string, confirm_new_password: string }} payload
 * @param {string} accessToken
 */
export async function changePassword(payload, accessToken) {
  const { data } = await apiClient.post("/api/auth/change-password", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function getInvitation(token) {
  const { data } = await apiClient.get(`/api/invitations/${token}`);
  return data;
}

export async function createInvitation(payload, accessToken) {
  const { data } = await apiClient.post("/api/invitations", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export async function getOnboarding(accessToken) {
  const { data } = await apiClient.get("/api/onboarding", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function saveOnboarding(payload, accessToken) {
  const { data } = await apiClient.put("/api/onboarding", payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

// ─── Error Helpers ───────────────────────────────────────────────────────────

export function getApiErrorMessage(error, fallbackMessage) {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail[0]?.msg || fallbackMessage;
  }
  return detail || fallbackMessage;
}