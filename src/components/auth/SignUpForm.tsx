"use client";

import { useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpForm() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  // --- STEP 1: Create user and send email verification code ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      // Use v7 password strategy
      const { error: signUpError } = await signUp.password({
        emailAddress: email,
        password,
        firstName: name.trim().split(" ")[0] || "",
        lastName: name.trim().split(" ").slice(1).join(" ") || "",
      });

      if (signUpError) {
        setError(signUpError.message || "Something went wrong");
        setLoading(false);
        return;
      }

      // Send email verification code using v7 API
      await signUp.verifications.sendEmailCode();

      setPendingVerification(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(
        clerkError.errors?.[0]?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: Verify the email code ---
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({
        code,
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid verification code");
        setLoading(false);
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize();
        router.push("/dashboard");
      } else {
        console.log("More steps required:", signUp.status);
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(
        clerkError.errors?.[0]?.message || "Invalid verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="auth-card">
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />

        <div className="auth-card-inner">
          <div className="auth-header">
            <div className="auth-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle">
              We sent a verification code to <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="auth-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="auth-form">
            <div className="auth-field">
              <label htmlFor="verify-code" className="auth-label">Verification code</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="verify-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="auth-input"
                  onChange={(e) => setCode(e.target.value)}
                  value={code}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || fetchStatus === "fetching"}
              className="auth-button"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                "Verify Email"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card-inner">
        <div className="auth-header">
          <div className="auth-icon" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-subtitle">Get started with your free account</p>
        </div>

        {error && (
          <div className="auth-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="auth-form">
          <div className="auth-field">
            <label htmlFor="signup-name" className="auth-label">Full name</label>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                className="auth-input"
                onChange={(e) => setName(e.target.value)}
                value={name}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-label">Email address</label>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                className="auth-input"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password" className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                className="auth-input"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
                minLength={8}
              />
            </div>
            <p className="auth-hint">Must be at least 8 characters</p>
          </div>

          {/* Clerk CAPTCHA widget mounts here for bot protection */}
          <div id="clerk-captcha" />

          <button
            type="submit"
            disabled={loading || fetchStatus === "fetching"}
            className="auth-button"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href="/sign-in" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}