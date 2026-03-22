"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="text-center max-w-[420px]" style={{ animation: "fadeInUp 0.4s ease" }}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            color: "var(--error-text)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-[1.4rem] font-bold text-[var(--text-primary)] mb-2 tracking-[-0.02em]">Something went wrong</h2>
        <p className="text-[0.9rem] leading-[1.6] text-[var(--text-muted)] mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 border-none text-[0.9rem] font-semibold py-3 px-8 rounded-[12px] cursor-pointer transition-all duration-200 text-[var(--btn-primary-text)] hover:-translate-y-px"
          style={{
            background: "var(--btn-primary-bg)",
            boxShadow: "0 0 16px var(--accent-glow)",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
