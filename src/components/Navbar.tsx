"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <div className="navbar-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span className="navbar-brand-text">Starter</span>
        </Link>

        <div className="navbar-actions">
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/dashboard" className="navbar-link">
                Dashboard
              </Link>
              <div className="navbar-user" onClick={() => setMenuOpen(!menuOpen)}>
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "Avatar"}
                    className="navbar-avatar"
                  />
                ) : (
                  <div className="navbar-avatar-fallback">
                    {(user.firstName?.[0] || "U").toUpperCase()}
                  </div>
                )}
                {menuOpen && (
                  <div className="navbar-dropdown">
                    <div className="navbar-dropdown-header">
                      <p className="navbar-dropdown-name">{user.fullName}</p>
                      <p className="navbar-dropdown-email">
                        {user.emailAddresses[0]?.emailAddress}
                      </p>
                    </div>
                    <button
                      onClick={() => signOut(() => router.push("/"))}
                      className="navbar-dropdown-item"
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
              <Link href="/sign-in" className="navbar-link">
                Sign In
              </Link>
              <Link href="/sign-up" className="navbar-cta">
                Get Started
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
