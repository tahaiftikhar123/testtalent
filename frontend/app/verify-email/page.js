"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

import { getApiErrorMessage, verifyEmail, resendVerification } from "@/services/authService";

export default function VerifyEmailPage() {
  const [state, setState] = useState(getInitialState);
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const { accessToken, hashError } = getVerificationContext();
    if (hashError) return;
    if (!accessToken) return;

    Promise.resolve().then(async () => {
      setState({ status: "loading", message: "Verifying your email and activating your account…" });
      try {
        const response = await verifyEmail(accessToken);
        setState({ status: "success", message: response.message });
        window.history.replaceState(null, "", window.location.pathname);
      } catch (error) {
        setState({ status: "error", message: getApiErrorMessage(error, "We could not verify this email link.") });
      }
    });
  }, []);

  const handleResend = useCallback(async () => {
    // Retrieve email from session storage (stored during registration)
    const email = sessionStorage.getItem("pendingEmail");
    if (!email) {
      setResendMessage("We couldn't find your email. Please try registering again.");
      return;
    }

    setResending(true);
    setResendMessage("");
    try {
      const data = await resendVerification(email);
      setResendMessage(data.message);
    } catch (error) {
      setResendMessage(getApiErrorMessage(error, "Could not resend verification email."));
    } finally {
      setResending(false);
    }
  }, []);

  const showResend = state.status === "waiting";

  return (
    <main className="verification-shell">
      <section className="verification-card" aria-labelledby="verification-heading">
        <Image src="/mazikglobal-logo.png" alt="Mazik Global" width={192} height={52} priority />
        <div className={`verification-icon ${state.status}`} aria-hidden="true">
          {state.status === "success" ? "✓" : state.status === "error" ? "!" : "✉"}
        </div>
        <p className="eyebrow">Email verification</p>
        <h1 id="verification-heading">
          {state.status === "success"
            ? "Your account is active"
            : state.status === "error"
            ? "We couldn’t verify this link"
            : "Verify your email"}
        </h1>
        <p className="verification-message" role="status">{state.message}</p>
        {state.status === "loading" && <span className="loading-dot" aria-label="Loading" />}

        {showResend && (
          <div style={{ marginTop: "1rem" }}>
            <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              Didn't receive the email? You can request a new one.
            </p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="secondary-button"
            >
              {resending ? "Resending…" : "Resend verification email"}
            </button>
            {resendMessage && (
              <p className="form-message" role="status" style={{ marginTop: "0.5rem" }}>
                {resendMessage}
              </p>
            )}
          </div>
        )}

        <Link className="secondary-link" href="/register">Return to registration</Link>
      </section>
    </main>
  );
}

function getVerificationContext() {
  if (typeof window === "undefined") return { accessToken: null, hashError: null };
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  return { accessToken: hashParams.get("access_token"), hashError: hashParams.get("error_description") };
}

function getInitialState() {
  const { hashError } = getVerificationContext();
  if (hashError) return { status: "error", message: hashError };
  return { status: "waiting", message: "Check your inbox and open the verification link to activate your account." };
}