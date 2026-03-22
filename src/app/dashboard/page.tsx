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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <span className="auth-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-6 pb-12 bg-[var(--bg-primary)]">
      <div className="max-w-[800px] mx-auto flex flex-col gap-5" style={{ animation: "fadeInUp 0.5s ease" }}>
        {/* Welcome Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex flex-col sm:flex-row items-center gap-6 p-8 text-center sm:text-left">
          <div className="shrink-0">
            {user.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt={user.fullName || "Avatar"} className="w-16 h-16 rounded-full border-[3px] border-[var(--accent)] object-cover" />
            ) : (
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-[var(--btn-primary-text)] text-[1.5rem] font-bold" style={{ background: "var(--btn-primary-bg)" }}>
                {(user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || "U").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]">
              Welcome back, {user.firstName || "there"}! 👋
            </h1>
            <p className="text-[0.9rem] text-[var(--text-muted)] mt-1">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] py-6 px-8 transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-[0.05em] font-semibold">Account</p>
              <p className="text-base font-bold text-[var(--text-primary)] mt-[0.1rem]">Active</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] py-6 px-8 transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-[0.05em] font-semibold">Security</p>
              <p className="text-base font-bold text-[var(--text-primary)] mt-[0.1rem]">Protected</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] py-6 px-8 transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-[0.05em] font-semibold">Joined</p>
              <p className="text-base font-bold text-[var(--text-primary)] mt-[0.1rem]">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] py-7 px-8 transition-all duration-200 hover:bg-[var(--bg-card-hover)]">
          <h2 className="text-base font-bold mb-5 tracking-[-0.01em]">Profile Details</h2>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-1 sm:gap-0 border-b border-[var(--border-color)] last:border-b-0">
            <span className="text-[0.85rem] text-[var(--text-muted)]">Full Name</span>
            <span className="text-[0.85rem] font-semibold text-[var(--text-primary)]">{user.fullName || "Not set"}</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-1 sm:gap-0 border-b border-[var(--border-color)] last:border-b-0">
            <span className="text-[0.85rem] text-[var(--text-muted)]">Email</span>
            <span className="text-[0.85rem] font-semibold text-[var(--text-primary)]">{user.emailAddresses[0]?.emailAddress}</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-1 sm:gap-0 border-b border-[var(--border-color)] last:border-b-0">
            <span className="text-[0.85rem] text-[var(--text-muted)]">User ID</span>
            <span className="text-[0.85rem] font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.8rem" }}>{user.id}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => signOut(() => router.push("/"))}
          className="flex items-center justify-center gap-2 w-full p-[0.85rem] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#f87171] rounded-[var(--radius)] text-[0.9rem] font-semibold font-inherit cursor-pointer transition-all duration-200 hover:bg-[rgba(239,68,68,0.15)] hover:border-[rgba(239,68,68,0.3)] hover:-translate-y-[1px]"
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
