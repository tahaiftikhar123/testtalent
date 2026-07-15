"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getApiErrorMessage, resetPassword } from "@/services/authService";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  // Pre-fill email from sessionStorage if navigating from forgot-password
  useEffect(() => {
    const stored = sessionStorage.getItem("resetEmail");
    if (stored) setEmail(stored);
  }, []);

  // OTP input handlers
  function handleOtpChange(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const updated = [...otp];
    for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
    setOtp(updated);
    const lastIdx = Math.min(pasted.length, 5);
    inputRefs.current[lastIdx]?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const code = otp.join("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (code.length !== 6) {
      setError("Please enter the full 6-digit reset code.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(password)) {
      setError("Use 8+ characters with uppercase, lowercase, number, and special character.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await resetPassword({
        email: email.trim(),
        otp: code,
        password,
        confirm_password: confirmPassword,
      });
      setMessage(data.message);
      sessionStorage.removeItem("resetEmail");
      setTimeout(() => router.push("/login"), 1600);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not reset password."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="reset-heading">
        <div className="brand-row">
          <Image src="/mazikglobal-logo.png" alt="Mazik Global" width={192} height={52} priority />
          <span className="brand-divider" aria-hidden="true" />
          <span className="product-name">Talent</span>
        </div>

        <div className="auth-intro">
          <p className="eyebrow">Account recovery</p>
          <h1 id="reset-heading">Set a new password</h1>
          <p>Enter the reset code sent to your email and choose a strong new password.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email field */}
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {/* OTP Digits */}
          <div>
            <span
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                marginBottom: "0.625rem",
                color: "#374151",
              }}
            >
              Reset code
            </span>
            <div
              style={{ display: "flex", gap: "10px", marginBottom: "1.25rem" }}
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  aria-label={`Reset code digit ${index + 1}`}
                  style={{
                    width: "46px",
                    height: "52px",
                    textAlign: "center",
                    fontSize: "1.4rem",
                    fontWeight: "700",
                    border: `2px solid ${digit ? "#2d6cdf" : "#cbd5e1"}`,
                    borderRadius: "8px",
                    outline: "none",
                    background: "#fff",
                    color: "#0f172a",
                    transition: "border-color 0.2s",
                  }}
                />
              ))}
            </div>
          </div>

          {/* New password */}
          <label className="field">
            <span>New password</span>
            <span className="password-control">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-button"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          {/* Confirm password */}
          <label className="field">
            <span>Confirm password</span>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className="form-message" role="alert">{error}</p>}
          {message && <p className="form-message" role="status">{message}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/forgot-password">Request a new code</Link>
          {" · "}
          <Link href="/login">Back to sign in</Link>
        </p>
      </section>

      <aside className="auth-aside" aria-label="Password reset help">
        <div>
          <p className="eyebrow">Mazik Global</p>
          <h2>Secure password recovery.</h2>
          <p>Enter the 6-digit code from your email once, choose a new password, then sign in.</p>
        </div>
      </aside>
    </main>
  );
}
