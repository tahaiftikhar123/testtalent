"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiErrorMessage, verifyEmail } from "@/services/authService";

export default function VerifyEmailPage() {
  const [state, setState] = useState(getInitialState);

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

  return (
    <main className="verification-shell">
      <section className="verification-card" aria-labelledby="verification-heading">
        <Image src="/mazikglobal-logo.png" alt="Mazik Global" width={192} height={52} priority />
        <div className={`verification-icon ${state.status}`} aria-hidden="true">{state.status === "success" ? "✓" : state.status === "error" ? "!" : "✉"}</div>
        <p className="eyebrow">Email verification</p>
        <h1 id="verification-heading">{state.status === "success" ? "Your account is active" : state.status === "error" ? "We couldn’t verify this link" : "Verify your email"}</h1>
        <p className="verification-message" role="status">{state.message}</p>
        {state.status === "loading" && <span className="loading-dot" aria-label="Loading" />}
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
