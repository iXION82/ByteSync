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
      <div className="relative w-full max-w-[440px] animate-[fadeInUp_0.5s_ease] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1] [background:repeating-linear-gradient(0deg,var(--scanline-color)_0px,var(--scanline-color)_1px,transparent_1px,transparent_3px)] opacity-50 rounded-[var(--radius-lg)]" aria-hidden="true" />
        <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[200px] h-[200px] bg-[var(--accent-glow-strong)] -top-[40px] -left-[60px]" />
        <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[160px] h-[160px] bg-[var(--accent-glow)] -bottom-[30px] -right-[50px] [animation-delay:-4s]" />

        <div className="relative z-[2] bg-[var(--bg-secondary)] backdrop-blur-[30px] [-webkit-backdrop-filter:blur(30px)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-10 shadow-[var(--shadow-glow)]">
          <div className="text-center mb-8">
            <div className="w-[52px] h-[52px] rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] mx-auto mb-4 shadow-[0_0_16px_var(--accent-glow)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 className="font-mono text-[2rem] font-normal tracking-[0.02em] text-[var(--accent)] animate-[text-glow_3s_infinite_ease-in-out]">{">"} VERIFY_EMAIL_</h1>
            <p className="text-[0.9rem] text-[var(--text-muted)] mt-[0.4rem]">
              Verification code sent to <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] px-4 py-[0.65rem] rounded-[var(--radius)] text-[0.85rem] mb-6 animate-[fadeIn_0.2s_ease]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              ERROR: {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="flex flex-col gap-5">
            <div className="flex flex-col gap-[0.35rem]">
              <label htmlFor="verify-code" className="font-sans text-[0.75rem] font-semibold text-[var(--accent-dim)] uppercase tracking-[0.08em]">VERIFICATION_CODE</label>
              <div className="relative flex items-center group/input">
                <svg className="absolute left-[14px] text-[var(--text-muted)] pointer-events-none transition-colors duration-200 group-focus-within/input:text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="verify-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="w-full py-3 pr-[0.9rem] pl-[2.8rem] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius)] text-[var(--text-primary)] text-[0.9rem] font-inherit outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-glow)] focus:bg-[var(--bg-card-hover)]"
                  onChange={(e) => setCode(e.target.value)}
                  value={code}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || fetchStatus === "fetching"}
              className="w-full p-[0.85rem] [background:var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none rounded-[var(--radius)] font-mono text-[1.3rem] font-normal cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_16px_var(--accent-glow)] mt-2 tracking-[0.03em] hover:not(:disabled):-translate-y-[1px] hover:not(:disabled):shadow-[0_0_28px_var(--accent-glow-strong)] active:not(:disabled):translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-[spin_0.6s_linear_infinite]" />
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
    <div className="relative w-full max-w-[440px] animate-[fadeInUp_0.5s_ease] overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1] [background:repeating-linear-gradient(0deg,var(--scanline-color)_0px,var(--scanline-color)_1px,transparent_1px,transparent_3px)] opacity-50 rounded-[var(--radius-lg)]" aria-hidden="true" />
      <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[200px] h-[200px] bg-[var(--accent-glow-strong)] -top-[40px] -left-[60px]" />
      <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[160px] h-[160px] bg-[var(--accent-glow)] -bottom-[30px] -right-[50px] [animation-delay:-4s]" />

      <div className="relative z-[2] bg-[var(--bg-secondary)] backdrop-blur-[30px] [-webkit-backdrop-filter:blur(30px)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-10 shadow-[var(--shadow-glow)]">
        <div className="text-center mb-8">
          <div className="w-[52px] h-[52px] rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] mx-auto mb-4 shadow-[0_0_16px_var(--accent-glow)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="font-mono text-[2rem] font-normal tracking-[0.02em] text-[var(--accent)] animate-[text-glow_3s_infinite_ease-in-out]">{">"} REGISTER_</h1>
          <p className="text-[0.9rem] text-[var(--text-muted)] mt-[0.4rem]">Initialize your ByteSync account</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] px-4 py-[0.65rem] rounded-[var(--radius)] text-[0.85rem] mb-6 animate-[fadeIn_0.2s_ease]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex flex-col gap-5">
          <div className="flex flex-col gap-[0.35rem]">
            <label htmlFor="signup-name" className="font-sans text-[0.75rem] font-semibold text-[var(--accent-dim)] uppercase tracking-[0.08em]">DISPLAY_NAME</label>
            <div className="relative flex items-center group/input">
              <svg className="absolute left-[14px] text-[var(--text-muted)] pointer-events-none transition-colors duration-200 group-focus-within/input:text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                className="w-full py-3 pr-[0.9rem] pl-[2.8rem] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius)] text-[var(--text-primary)] text-[0.9rem] font-inherit outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-glow)] focus:bg-[var(--bg-card-hover)]"
                onChange={(e) => setName(e.target.value)}
                value={name}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-[0.35rem]">
            <label htmlFor="signup-email" className="font-sans text-[0.75rem] font-semibold text-[var(--accent-dim)] uppercase tracking-[0.08em]">EMAIL_ADDRESS</label>
            <div className="relative flex items-center group/input">
              <svg className="absolute left-[14px] text-[var(--text-muted)] pointer-events-none transition-colors duration-200 group-focus-within/input:text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="signup-email"
                type="email"
                placeholder="user@bytesync.dev"
                className="w-full py-3 pr-[0.9rem] pl-[2.8rem] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius)] text-[var(--text-primary)] text-[0.9rem] font-inherit outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-glow)] focus:bg-[var(--bg-card-hover)]"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-[0.35rem]">
            <label htmlFor="signup-password" className="font-sans text-[0.75rem] font-semibold text-[var(--accent-dim)] uppercase tracking-[0.08em]">PASSWORD</label>
            <div className="relative flex items-center group/input">
              <svg className="absolute left-[14px] text-[var(--text-muted)] pointer-events-none transition-colors duration-200 group-focus-within/input:text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                className="w-full py-3 pr-[0.9rem] pl-[2.8rem] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius)] text-[var(--text-primary)] text-[0.9rem] font-inherit outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-glow)] focus:bg-[var(--bg-card-hover)]"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
                minLength={8}
              />
            </div>
            <p className="text-[0.75rem] text-[var(--text-muted)] mt-[0.15rem]">Min 8 characters required</p>
          </div>

          <div id="clerk-captcha" />

          <button
            type="submit"
            disabled={loading || fetchStatus === "fetching"}
            className="w-full p-[0.85rem] [background:var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none rounded-[var(--radius)] font-mono text-[1.3rem] font-normal cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_16px_var(--accent-glow)] mt-2 tracking-[0.03em] hover:not(:disabled):-translate-y-[1px] hover:not(:disabled):shadow-[0_0_28px_var(--accent-glow-strong)] active:not(:disabled):translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-[spin_0.6s_linear_infinite]" />
            ) : (
              ">> CREATE_ACCOUNT"
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-[0.85rem] text-[var(--text-muted)]">
          Already registered?{" "}
          <Link href="/sign-in" className="text-[var(--accent)] no-underline font-semibold transition-colors duration-200 hover:text-[var(--text-primary)]">
            SIGN_IN &gt;
          </Link>
        </p>
      </div>
    </div>
  );
}