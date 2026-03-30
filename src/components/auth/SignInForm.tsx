"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type VerificationMode = "none" | "totp" | "email_code" | "phone_code";

export default function SignInForm() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification state — supports TOTP (real MFA) and email_code (device trust)
  const [verificationMode, setVerificationMode] = useState<VerificationMode>("none");
  const [verificationCode, setVerificationCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await signIn.password({
        identifier: email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize();
        router.push("/dashboard");
      } else if (
        signIn.status === "needs_second_factor" ||
        (signIn.status as string) === "needs_client_trust"
      ) {
        // Determine which second-factor strategy is available
        const factors = signIn.supportedSecondFactors ?? [];
        const strategies = factors.map((f: { strategy: string }) => f.strategy);

        if (strategies.includes("totp")) {
          // Real MFA — user has TOTP authenticator enrolled
          setVerificationMode("totp");
        } else if (strategies.includes("email_code")) {
          // Device trust — Clerk sends a verification code to email
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (signIn as any).prepareSecondFactor({ strategy: "email_code" });
          } catch {
            // prepareSecondFactor may not be needed if Clerk auto-sends
          }
          setVerificationMode("email_code");
        } else if (strategies.includes("phone_code")) {
          // Device trust via phone
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (signIn as any).prepareSecondFactor({ strategy: "phone_code" });
          } catch {
            // prepareSecondFactor may not be needed if Clerk auto-sends
          }
          setVerificationMode("phone_code");
        } else {
          // No recognized strategy — log and show error
          console.log("Unsupported second factor strategies:", strategies);
          setError("Additional verification is required but not supported. Please contact support.");
        }
      } else {
        console.log("Unhandled sign-in status:", signIn.status);
        setError("Additional verification required.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(
        clerkError.errors?.[0]?.message || "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const result = await (signIn as any).attemptSecondFactor({
        strategy: verificationMode,
        code: verificationCode,
      });

      if (result.status === "complete") {
        await signIn.finalize();
        router.push("/dashboard");
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string; longMessage?: string }[] };
      setError(
        clerkError.errors?.[0]?.longMessage ||
        clerkError.errors?.[0]?.message ||
        "Invalid verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Verification titles/descriptions per mode ──────────────
  const verificationConfig = {
    totp: {
      title: "> 2FA_VERIFY_",
      description: "Enter the code from your authenticator app",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1" />
        </svg>
      ),
    },
    email_code: {
      title: "> VERIFY_DEVICE_",
      description: `We sent a verification code to ${email || "your email"}`,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    phone_code: {
      title: "> VERIFY_DEVICE_",
      description: "We sent a verification code to your phone",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
    },
  };

  // ─── Verification Screen (TOTP / Email Code / Phone Code) ────
  if (verificationMode !== "none") {
    const config = verificationConfig[verificationMode];
    return (
      <div className="relative w-full max-w-[440px] animate-[fadeInUp_0.5s_ease] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1] [background:repeating-linear-gradient(0deg,var(--scanline-color)_0px,var(--scanline-color)_1px,transparent_1px,transparent_3px)] opacity-50 rounded-[var(--radius-lg)]" aria-hidden="true" />

        <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[200px] h-[200px] bg-[var(--accent-glow-strong)] -top-[40px] -left-[60px]" />
        <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[160px] h-[160px] bg-[var(--accent-glow)] -bottom-[30px] -right-[50px] [animation-delay:-4s]" />

        <div className="relative z-[2] bg-[var(--bg-secondary)] backdrop-blur-[30px] [-webkit-backdrop-filter:blur(30px)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-10 shadow-[var(--shadow-glow)]">
          <div className="text-center mb-8">
            <div className="w-[52px] h-[52px] rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] mx-auto mb-4 shadow-[0_0_16px_var(--accent-glow)]">
              {config.icon}
            </div>
            <h1 className="font-mono text-[2rem] font-normal tracking-[0.02em] text-[var(--accent)] animate-[text-glow_3s_infinite_ease-in-out]">{config.title}</h1>
            <p className="text-[0.9rem] text-[var(--text-muted)] mt-[0.4rem]">{config.description}</p>
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

          <form onSubmit={handleVerificationSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-[0.35rem]">
              <label htmlFor="signin-verify-code" className="font-sans text-[0.75rem] font-semibold text-[var(--accent-dim)] uppercase tracking-[0.08em]">VERIFICATION_CODE</label>
              <div className="relative flex items-center group/input">
                <svg className="absolute left-[14px] text-[var(--text-muted)] pointer-events-none transition-colors duration-200 group-focus-within/input:text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="signin-verify-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full py-3 pr-[0.9rem] pl-[2.8rem] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius)] text-[var(--accent)] text-center text-[1.5rem] font-mono font-bold tracking-[0.4em] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:opacity-30 placeholder:tracking-[0.4em] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-glow)] focus:bg-[var(--bg-card-hover)]"
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  value={verificationCode}
                  autoFocus
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length < 6}
              className="w-full p-[0.85rem] [background:var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none rounded-[var(--radius)] font-mono text-[1.3rem] font-normal cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_16px_var(--accent-glow)] mt-2 tracking-[0.03em] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-[spin_0.6s_linear_infinite]" />
              ) : (
                ">> VERIFY"
              )}
            </button>
          </form>

          <button
            onClick={() => { setVerificationMode("none"); setVerificationCode(""); setError(""); }}
            className="w-full text-center mt-4 text-[0.85rem] text-[var(--text-muted)] bg-transparent border-none cursor-pointer font-inherit transition-colors duration-200"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // ─── Normal Sign-In Screen ───────────────────────────────────
  return (
    <div className="relative w-full max-w-[440px] animate-[fadeInUp_0.5s_ease] overflow-hidden">
      {/* CRT scanline overlay for auth card */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1] [background:repeating-linear-gradient(0deg,var(--scanline-color)_0px,var(--scanline-color)_1px,transparent_1px,transparent_3px)] opacity-50 rounded-[var(--radius-lg)]" aria-hidden="true" />

      {/* Decorative glow orbs */}
      <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[200px] h-[200px] bg-[var(--accent-glow-strong)] -top-[40px] -left-[60px]" />
      <div className="absolute rounded-full blur-[80px] pointer-events-none animate-[float_8s_infinite_ease-in-out] w-[160px] h-[160px] bg-[var(--accent-glow)] -bottom-[30px] -right-[50px] [animation-delay:-4s]" />

      <div className="relative z-[2] bg-[var(--bg-secondary)] backdrop-blur-[30px] [-webkit-backdrop-filter:blur(30px)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-10 shadow-[var(--shadow-glow)]">
        <div className="text-center mb-8">
          <div className="w-[52px] h-[52px] rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] mx-auto mb-4 shadow-[0_0_16px_var(--accent-glow)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-mono text-[2rem] font-normal tracking-[0.02em] text-[var(--accent)] animate-[text-glow_3s_infinite_ease-in-out]">{">"} SIGN_IN_</h1>
          <p className="text-[0.9rem] text-[var(--text-muted)] mt-[0.4rem]">Access your terminal session</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-[0.35rem]">
            <label htmlFor="signin-email" className="font-sans text-[0.75rem] font-semibold text-[var(--accent-dim)] uppercase tracking-[0.08em]">EMAIL_ADDRESS</label>
            <div className="relative flex items-center group/input">
              <svg className="absolute left-[14px] text-[var(--text-muted)] pointer-events-none transition-colors duration-200 group-focus-within/input:text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="signin-email"
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
            <label htmlFor="signin-password" className="font-sans text-[0.75rem] font-semibold text-[var(--accent-dim)] uppercase tracking-[0.08em]">PASSWORD</label>
            <div className="relative flex items-center group/input">
              <svg className="absolute left-[14px] text-[var(--text-muted)] pointer-events-none transition-colors duration-200 group-focus-within/input:text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                className="w-full py-3 pr-[0.9rem] pl-[2.8rem] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius)] text-[var(--text-primary)] text-[0.9rem] font-inherit outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-glow)] focus:bg-[var(--bg-card-hover)]"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
              />
            </div>
          </div>

          <div id="clerk-captcha" />

          <button
            type="submit"
            disabled={loading || fetchStatus === "fetching"}
            className="w-full p-[0.85rem] [background:var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-none rounded-[var(--radius)] font-mono text-[1.3rem] font-normal cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_16px_var(--accent-glow)] mt-2 tracking-[0.03em] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-[spin_0.6s_linear_infinite]" />
            ) : (
              ">> AUTHENTICATE"
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-[0.85rem] text-[var(--text-muted)]">
          No account?{" "}
          <Link href="/sign-up" className="text-[var(--accent)] no-underline font-semibold transition-colors duration-200 hover:text-[var(--text-primary)]">
            REGISTER_NEW &gt;
          </Link>
        </p>
      </div>
    </div>
  );
}