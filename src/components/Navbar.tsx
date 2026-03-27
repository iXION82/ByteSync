"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("bytesync-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("bytesync-theme", next);
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-[100] bg-[var(--navbar-bg)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)] border-b border-[var(--border-color)] transition-colors duration-300">
      <div className="w-full max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-[0.6rem] no-underline text-[var(--text-primary)] group">
          <div className="w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-[var(--accent)] transition-all duration-200 group-hover:border-[var(--accent)] group-hover:shadow-[0_0_12px_var(--accent-glow)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
              <line x1="12" y1="2" x2="12" y2="22" opacity="0.4" />
            </svg>
          </div>
          <span className="font-mono text-2xl font-normal tracking-[0.02em] text-[var(--accent)]">ByteSync</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] cursor-pointer transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-[0_0_12px_var(--accent-glow)]"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {isLoaded && isSignedIn ? (
            <>
              <div className="relative cursor-pointer group" onClick={() => setMenuOpen(!menuOpen)}>
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "Avatar"}
                    className="w-9 h-9 rounded-full border-2 border-[var(--border-color)] transition-colors duration-200 object-cover group-hover:border-[var(--accent)]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full [background:var(--btn-primary-bg)] flex items-center justify-center text-[var(--btn-primary-text)] font-bold text-[0.85rem] group-hover:border-[var(--accent)]">
                    {(user.firstName?.[0] || "U").toUpperCase()}
                  </div>
                )}
                {menuOpen && (
                  <div className="absolute top-[calc(100%+8px)] right-0 bg-[var(--bg-secondary)] backdrop-blur-[20px] border border-[var(--border-color)] rounded-[var(--radius)] w-[220px] overflow-hidden animate-[fadeIn_0.15s_ease] shadow-[var(--shadow-lg)]">
                    <div className="py-3 px-4 border-b border-[var(--border-color)]">
                      <p className="text-[0.85rem] font-semibold text-[var(--text-primary)] m-0">{user.fullName}</p>
                      <p className="text-[0.75rem] text-[var(--text-muted)] mt-[2px] m-0">
                        {user.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); router.push("/dashboard"); }}
                      className="flex items-center gap-2 w-full px-4 py-[0.65rem] bg-transparent border-none text-[var(--text-secondary)] text-[0.85rem] cursor-pointer transition-all duration-150 font-inherit hover:bg-[var(--bg-card-hover)] hover:text-[var(--accent)]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      Dashboard
                    </button>
                    <button
                      onClick={() => signOut(() => router.push("/"))}
                      className="flex items-center gap-2 w-full px-4 py-[0.65rem] bg-transparent border-none text-[var(--text-secondary)] text-[0.85rem] cursor-pointer transition-all duration-150 font-inherit hover:bg-[var(--bg-card-hover)] hover:text-[#ef4444]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : isLoaded ? (
            <>
              <Link href="/sign-in" className="text-[var(--text-secondary)] no-underline font-sans text-[0.85rem] font-medium px-3 py-1.5 rounded-md border border-transparent transition-all duration-200 hover:text-[var(--accent)] hover:border-[var(--border-color)] hover:bg-[var(--bg-card)]">
                Sign In
              </Link>
              <Link href="/sign-up" className="[background:var(--btn-primary-bg)] text-[var(--btn-primary-text)] no-underline font-mono text-[1.15rem] font-normal px-[1.2rem] py-1.5 rounded-md transition-all duration-200 shadow-[0_0_12px_var(--accent-glow)] hover:-translate-y-[1px] hover:shadow-[0_0_24px_var(--accent-glow-strong)]">
                Get Started
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
