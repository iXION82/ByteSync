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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
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
      console.log("Sign-up status:", signUp.status, "userId:", signUp.createdUserId);
      // Save Data in MongoDB
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: signUp.createdUserId || "unknown",
            email,
            name: name.trim(),
          }),
        });
        const data = await res.json();
        console.log("MongoDB save response:", res.status, data);
      } catch (dbError) {
        console.error("Failed to save user to MongoDB:", dbError);
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
        <div className="auth-scanlines" aria-hidden="true" />
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />

        <div className="auth-card-inner">
          <div className="auth-header">
            <div className="auth-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className="auth-title">{">"} VERIFY_EMAIL_</h1>
            <p className="auth-subtitle">
              Verification code sent to <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="auth-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              ERROR: {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="auth-form">
            <div className="auth-field">
              <label htmlFor="verify-code" className="auth-label">VERIFICATION_CODE</label>
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
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                ">> VERIFY"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-scanlines" aria-hidden="true" />
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card-inner">
        <div className="auth-header">
          <div className="auth-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="auth-title">{">"} REGISTER_</h1>
          <p className="auth-subtitle">Initialize your ByteSync account</p>
        </div>

        {error && (
          <div className="auth-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="auth-form">
          <div className="auth-field">
            <label htmlFor="signup-name" className="auth-label">DISPLAY_NAME</label>
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
            <label htmlFor="signup-email" className="auth-label">EMAIL_ADDRESS</label>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="signup-email"
                type="email"
                placeholder="user@bytesync.dev"
                className="auth-input"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password" className="auth-label">PASSWORD</label>
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
            <p className="auth-hint">Min 8 characters required</p>
          </div>

          <div id="clerk-captcha" />

          <button
            type="submit"
            disabled={loading || fetchStatus === "fetching"}
            className="auth-button"
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              ">> CREATE_ACCOUNT"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already registered?{" "}
          <Link href="/sign-in" className="auth-link">
            SIGN_IN &gt;
          </Link>
        </p>
      </div>
    </div>
  );
}