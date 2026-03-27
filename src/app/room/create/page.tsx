"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LANGUAGES, DEFAULT_LANGUAGE_ID } from "@/lib/editorConstants";
import { ensureUserInDb } from "@/lib/ensureUser";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export default function CreateRoomPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      // Ensure user is synced to MongoDB first
      await ensureUserInDb(user);

      const res = await fetch(`${SERVER_URL}/api/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          password,
          codeLanguage: languageId,
          code: LANGUAGES.find((l) => l.id === languageId)?.starterCode || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create room");
        return;
      }

      // Navigate to the session room
      router.push(`/room/session/${data.roomId}`);
    } catch {
      setError("Could not connect to server. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <span
          className="inline-block w-10 h-10 border-[3px] border-[var(--accent)] border-t-transparent rounded-full"
          style={{ animation: "spin 0.6s linear infinite" }}
        />
      </div>
    );
  }

  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="min-h-screen pt-24 px-6 pb-12 bg-[var(--bg-primary)]">
      {/* Scanline overlay */}
      <div
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] opacity-60"
        style={{
          background:
            "repeating-linear-gradient(0deg, var(--scanline-color) 0px, var(--scanline-color) 1px, transparent 1px, transparent 3px)",
        }}
        aria-hidden="true"
      />

      <div
        className="max-w-[480px] mx-auto"
        style={{ animation: "fadeInUp 0.5s ease" }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)] px-4 py-1.5 rounded-full font-sans text-xs font-semibold tracking-wider uppercase mb-4">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "var(--accent)",
                animation: "badge-pulse 2s infinite",
              }}
            />
            CREATE ROOM
          </div>
          <h1
            className="font-mono text-[2rem] text-[var(--accent)] mb-2 tracking-[0.02em]"
            style={{ animation: "text-glow 3s infinite ease-in-out" }}
          >
            {">"} New Room_
          </h1>
          <p className="font-sans text-sm text-[var(--text-muted)]">
            Set up a collaborative coding room for your team
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleCreate}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-8 flex flex-col gap-6"
        >
          {/* Language Selector */}
          <div className="flex flex-col gap-2">
            <label
              className="font-sans text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase"
              htmlFor="create-lang"
            >
              Language
            </label>
            <select
              id="create-lang"
              className="font-sans text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 px-4 outline-none cursor-pointer transition-all duration-200 focus:border-[var(--accent)]"
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label
              className="font-sans text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase"
              htmlFor="create-password"
            >
              Room Password
            </label>
            <input
              id="create-password"
              type="password"
              placeholder="Min 4 characters"
              className="font-sans text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 px-4 outline-none transition-all duration-200 focus:border-[var(--accent)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label
              className="font-sans text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase"
              htmlFor="create-confirm-password"
            >
              Confirm Password
            </label>
            <input
              id="create-confirm-password"
              type="password"
              placeholder="Re-enter password"
              className="font-sans text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 px-4 outline-none transition-all duration-200 focus:border-[var(--accent)]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error-text)] text-sm font-sans px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 font-mono text-lg py-3 px-6 rounded-lg border-none cursor-pointer transition-all duration-200 text-[var(--btn-primary-text)] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-[2px]"
            style={{
              background: "var(--btn-primary-bg)",
              boxShadow: "0 0 20px var(--accent-glow)",
            }}
          >
            {isLoading ? (
              <>
                <span
                  className="inline-block w-4 h-4 border-2 border-[var(--btn-primary-text)] border-t-transparent rounded-full"
                  style={{ animation: "spin 0.6s linear infinite" }}
                />
                Creating...
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
