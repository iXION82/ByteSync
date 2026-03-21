"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="dashboard-loading">
        <span className="auth-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Welcome Card */}
        <div className="dashboard-card dashboard-welcome">
          <div className="dashboard-avatar">
            {user.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt={user.fullName || "Avatar"} />
            ) : (
              <div className="dashboard-avatar-fallback">
                {(user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || "U").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="dashboard-title">
              Welcome back, {user.firstName || "there"}! 👋
            </h1>
            <p className="dashboard-subtitle">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-grid">
          <div className="dashboard-card dashboard-stat">
            <div className="dashboard-stat-icon" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="dashboard-stat-label">Account</p>
              <p className="dashboard-stat-value">Active</p>
            </div>
          </div>

          <div className="dashboard-card dashboard-stat">
            <div className="dashboard-stat-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="dashboard-stat-label">Security</p>
              <p className="dashboard-stat-value">Protected</p>
            </div>
          </div>

          <div className="dashboard-card dashboard-stat">
            <div className="dashboard-stat-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="dashboard-stat-label">Joined</p>
              <p className="dashboard-stat-value">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details Card */}
        <div className="dashboard-card dashboard-details">
          <h2 className="dashboard-section-title">Profile Details</h2>
          <div className="dashboard-detail-row">
            <span className="dashboard-detail-label">Full Name</span>
            <span className="dashboard-detail-value">{user.fullName || "Not set"}</span>
          </div>
          <div className="dashboard-detail-row">
            <span className="dashboard-detail-label">Email</span>
            <span className="dashboard-detail-value">{user.emailAddresses[0]?.emailAddress}</span>
          </div>
          <div className="dashboard-detail-row">
            <span className="dashboard-detail-label">User ID</span>
            <span className="dashboard-detail-value" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.8rem" }}>{user.id}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => signOut(() => router.push("/"))}
          className="dashboard-signout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
