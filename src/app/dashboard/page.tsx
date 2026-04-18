"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ensureUserInDb } from "@/lib/ensureUser";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

interface RoomInfo {
  _id: string;
  roomCode: string;
  codeLanguage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  relationship: "owner" | "member";
  allowedUsers: { userId: string; role: string }[];
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [createdRooms, setCreatedRooms] = useState<RoomInfo[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<RoomInfo[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    setIsLoadingRooms(true);
    try {
      await ensureUserInDb(user);

      const res = await fetch(`${SERVER_URL}/api/users/${user.id}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setCreatedRooms(data.createdRooms || []);
        setJoinedRooms(data.joinedRooms || []);
        setActiveRoomId(data.activeRoomId || null);
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      fetchRooms();
    }
  }, [isLoaded, isSignedIn, user, fetchRooms]);

  const handleDeleteRoom = async (roomId: string) => {
    if (!user) return;
    setDeleteLoading(roomId);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id }),
      });
      if (res.ok) {
        await fetchRooms();
      }
    } catch (err) {
      console.error("Failed to delete room:", err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleQuickJoin = (roomId: string) => {
    router.push(`/room/session/${roomId}`);
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <span
          className="inline-block w-10 h-10 border-[3px] border-[var(--accent)] border-t-transparent rounded-full"
          style={{ animation: "spin 0.6s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-6 pb-12 bg-[var(--bg-primary)]">
      <div
        className="max-w-[900px] mx-auto flex flex-col gap-5"
        style={{ animation: "fadeInUp 0.5s ease" }}
      >
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex flex-col sm:flex-row items-center gap-6 p-8 text-center sm:text-left">
          <div className="shrink-0">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "Avatar"}
                className="w-16 h-16 rounded-full border-[3px] border-[var(--accent)] object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-[var(--btn-primary-text)] text-[1.5rem] font-bold"
                style={{ background: "var(--btn-primary-bg)" }}
              >
                {(
                  user.firstName?.[0] ||
                  user.emailAddresses[0]?.emailAddress[0] ||
                  "U"
                ).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]">
              Welcome back, {user.firstName || "there"}! 👋
            </h1>
            <p className="text-[0.9rem] text-[var(--text-muted)] mt-1">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/room/create"
              className="inline-flex items-center gap-2 font-mono text-sm no-underline px-4 py-2 rounded-lg transition-all duration-200 text-[var(--btn-primary-text)] hover:-translate-y-[1px]"
              style={{
                background: "var(--btn-primary-bg)",
                boxShadow: "0 0 12px var(--accent-glow)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create
            </Link>
            <Link
              href="/room/join"
              className="inline-flex items-center gap-2 font-mono text-sm no-underline px-4 py-2 rounded-lg border border-[var(--btn-secondary-border)] text-[var(--btn-secondary-text)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:border-[var(--accent)] hover:-translate-y-[1px]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Join
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] py-6 px-8 transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-[0.05em] font-semibold">
                Created
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] mt-[0.1rem]">
                {createdRooms.length} / 3
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] py-6 px-8 transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </div>
            <div>
              <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-[0.05em] font-semibold">
                Joined
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] mt-[0.1rem]">
                {joinedRooms.length} / 3
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] py-6 px-8 transition-all duration-200 hover:bg-[var(--bg-card-hover)] flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="text-[0.75rem] text-[var(--text-muted)] uppercase tracking-[0.05em] font-semibold">
                Joined
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] mt-[0.1rem]">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-8 transition-all duration-200">
          <h2 className="text-base font-bold mb-5 tracking-[-0.01em] flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Your Rooms
          </h2>

          {isLoadingRooms ? (
            <div className="flex items-center justify-center py-12">
              <span
                className="inline-block w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full"
                style={{ animation: "spin 0.6s linear infinite" }}
              />
            </div>
          ) : createdRooms.length === 0 && joinedRooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-muted)] text-sm mb-4">
                No rooms yet. Create or join one to get started!
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/room/create"
                  className="inline-flex items-center gap-2 font-mono text-sm no-underline px-4 py-2 rounded-lg transition-all duration-200 text-[var(--btn-primary-text)]"
                  style={{ background: "var(--btn-primary-bg)" }}
                >
                  Create Room
                </Link>
                <Link
                  href="/room/join"
                  className="inline-flex items-center gap-2 font-mono text-sm no-underline px-4 py-2 rounded-lg border border-[var(--btn-secondary-border)] text-[var(--btn-secondary-text)]"
                >
                  Join Room
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {createdRooms.length > 0 && (
                <>
                  <p className="text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wider font-semibold mt-1">
                    Rooms You Created
                  </p>
                  {createdRooms.map((room) => (
                    <RoomCard
                      key={room._id}
                      room={room}
                      activeRoomId={activeRoomId}
                      onQuickJoin={handleQuickJoin}
                      onDelete={handleDeleteRoom}
                      deleteLoading={deleteLoading}
                    />
                  ))}
                </>
              )}

              {joinedRooms.length > 0 && (
                <>
                  <p className="text-[0.7rem] text-[var(--text-muted)] uppercase tracking-wider font-semibold mt-4">
                    Rooms You Joined
                  </p>
                  {joinedRooms.map((room) => (
                    <RoomCard
                      key={room._id}
                      room={room}
                      activeRoomId={activeRoomId}
                      onQuickJoin={handleQuickJoin}
                      onDelete={null}
                      deleteLoading={null}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => signOut(() => router.push("/"))}
          className="flex items-center justify-center gap-2 w-full p-[0.85rem] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#f87171] rounded-[var(--radius)] text-[0.9rem] font-semibold font-inherit cursor-pointer transition-all duration-200 hover:bg-[rgba(239,68,68,0.15)] hover:border-[rgba(239,68,68,0.3)] hover:-translate-y-[1px]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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

function RoomCard({
  room,
  activeRoomId,
  onQuickJoin,
  onDelete,
  deleteLoading,
}: {
  room: RoomInfo;
  activeRoomId: string | null;
  onQuickJoin: (roomId: string) => void;
  onDelete: ((roomId: string) => void) | null;
  deleteLoading: string | null;
}) {
  const isCurrentlyActive = activeRoomId === room._id;
  const langLabel = room.codeLanguage.charAt(0).toUpperCase() + room.codeLanguage.slice(1);

  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all duration-200 hover:bg-[var(--bg-card-hover)]"
      style={{
        borderColor: isCurrentlyActive
          ? "var(--accent)"
          : "var(--border-color)",
        boxShadow: isCurrentlyActive
          ? "0 0 12px var(--accent-glow)"
          : "none",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="shrink-0 font-mono text-sm font-bold tracking-[0.15em] text-[var(--accent)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg">
          {room.roomCode}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background:
                  room.relationship === "owner"
                    ? "rgba(99, 102, 241, 0.15)"
                    : "rgba(16, 185, 129, 0.15)",
                color:
                  room.relationship === "owner" ? "#818cf8" : "#34d399",
              }}
            >
              {room.relationship === "owner" ? "Owner" : "Member"}
            </span>

            {room.isActive ? (
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(0,255,136,0.1)] text-[var(--accent-success)]">
                Active
              </span>
            ) : (
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(255,71,87,0.1)] text-[var(--error-text)]">
                Inactive
              </span>
            )}

            <span className="text-[0.7rem] text-[var(--text-muted)]">
              {langLabel}
            </span>
          </div>
          <p className="text-[0.75rem] text-[var(--text-muted)] mt-1">
            {room.allowedUsers?.length || 0} participant
            {(room.allowedUsers?.length || 0) !== 1 ? "s" : ""} •{" "}
            {new Date(room.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {room.isActive && (
          <button
            onClick={() => onQuickJoin(room._id)}
            className="inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg transition-all duration-200 text-[var(--btn-primary-text)] hover:-translate-y-[1px]"
            style={{
              background: "var(--btn-primary-bg)",
              boxShadow: "0 0 8px var(--accent-glow)",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {isCurrentlyActive ? "Rejoin" : "Quick Join"}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(room._id)}
            disabled={deleteLoading === room._id}
            className="inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg border border-[rgba(239,68,68,0.2)] text-[#f87171] transition-all duration-200 hover:bg-[rgba(239,68,68,0.1)] hover:border-[rgba(239,68,68,0.4)] disabled:opacity-50"
          >
            {deleteLoading === room._id ? (
              <span
                className="inline-block w-3 h-3 border-2 border-[#f87171] border-t-transparent rounded-full"
                style={{ animation: "spin 0.6s linear infinite" }}
              />
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            )}
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
