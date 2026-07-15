"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { forgotPassword, getApiErrorMessage } from "@/services/authService";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await forgotPassword(email.trim());
      setMessage(data.message);
      // Store email for the reset-password page to pre-fill
      sessionStorage.setItem("resetEmail", email.trim());
      // After a short delay, navigate to the reset password page
      setTimeout(() => router.push("/reset-password"), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="forgot-heading">
        <div className="brand-row">
          <Image src="/mazikglobal-logo.png" alt="Mazik Global" width={192} height={52} priority />
          <span className="brand-divider" aria-hidden="true" />
          <span className="product-name">Talent</span>
        </div>

        <div className="auth-intro">
          <p className="eyebrow">Account recovery</p>
          <h1 id="forgot-heading">Reset your password</h1>
          <p>Enter your email address. We&apos;ll send a one-time reset code.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Company email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {error && <p className="form-message error">{error}</p>}
          {message && <p className="form-message success">{message}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending code…" : "Send reset code"}
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>

      <aside className="auth-aside" aria-label="Talent platform introduction">
        <div>
          <p className="eyebrow">Mazik Global</p>
          <h2>Reset securely.</h2>
          <p>We will email you a one‑time code to set a new password. It expires in 10 minutes.</p>
        </div>
        <div className="aside-metric">
          <strong>Secure by design</strong>
          <span>OTP reset codes expire after 10 minutes.</span>
        </div>
      </aside>
    </main>
  );
}