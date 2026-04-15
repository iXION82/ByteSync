"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center gap-2 h-full bg-background font-sans text-[0.9rem] text-(--text-muted)">
      <span className="text-(--accent)">{">"} Loading editor...</span>
      <span className="text-(--accent)" style={{ animation: "blink 1s step-end infinite" }}>█</span>
    </div>
  ),
});

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

// ─── Types ──────────────────────────────────────────────────────

interface SnapshotFile {
  filename: string;
  content: string;
  language: string;
}

interface Snapshot {
  _id: string;
  seq: number;
  timestamp: string;
  files: SnapshotFile[];
  activeFile: string;
  codeLanguage: string;
  username?: string;
  trigger: string;
}

const TRIGGER_META: Record<string, { label: string; icon: string; color: string }> = {
  auto:             { label: "Auto-save",        icon: "💾", color: "#6366f1" },
  manual:           { label: "Manual Save",      icon: "📌", color: "#22c55e" },
  join:             { label: "User Joined",      icon: "👤", color: "#3b82f6" },
  leave:            { label: "User Left",        icon: "👋", color: "#ef4444" },
  "file-change":    { label: "File Changed",     icon: "📄", color: "#f59e0b" },
  "language-change":{ label: "Language Changed",  icon: "🔤", color: "#8b5cf6" },
};

// ─── Page ───────────────────────────────────────────────────────

export default function ReplayPage() {
  const params = useParams();
  const roomId = params?.roomId
    ? (Array.isArray(params.roomId) ? params.roomId[0] : params.roomId)
    : "";

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Currently viewed file within a snapshot
  const [viewingFile, setViewingFile] = useState("");

  const editorRef = useRef<{ setRemoteCode: (code: string) => void } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ─── Load snapshots ───────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/replay/snapshots`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const snaps: Snapshot[] = data.snapshots;
        setSnapshots(snaps);
        if (snaps.length > 0) {
          setSelectedIndex(snaps.length - 1); // start at latest
          setViewingFile(snaps[snaps.length - 1].activeFile || snaps[snaps.length - 1].files[0]?.filename || "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load replay data");
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  // ─── Update editor when selection changes ─────────────────────
  const selected = snapshots[selectedIndex];

  useEffect(() => {
    if (!selected) return;
    const file = selected.files.find(f => f.filename === viewingFile) || selected.files[0];
    if (file) {
      editorRef.current?.setRemoteCode(file.content);
      if (file.filename !== viewingFile) setViewingFile(file.filename);
    }
  }, [selectedIndex, selected, viewingFile]);

  // ─── Scroll the active item into view ─────────────────────────
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  // ─── Keyboard navigation ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(0, i - 1));
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(snapshots.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [snapshots.length]);

  // ─── Helpers ──────────────────────────────────────────────────
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const currentFile = selected?.files.find(f => f.filename === viewingFile) || selected?.files[0];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden pt-16" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* ─── Header ───────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 h-12 min-h-12 border-b border-(--border-color) z-20"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/room/session/${roomId}`}
            className="flex items-center gap-1.5 text-(--text-muted) hover:text-(--accent) text-xs transition-colors no-underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            BACK TO SESSION
          </Link>
          <div className="w-px h-5 bg-(--border-color)" />
          <div className="flex items-center gap-2 text-(--accent)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-xs font-semibold tracking-wider uppercase">SESSION REPLAY</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[0.65rem] text-(--text-muted)">
          {snapshots.length > 0 && (
            <>
              <span>{snapshots.length} snapshots</span>
              <span className="hidden sm:inline">{formatDate(snapshots[0].timestamp)} — {formatDate(snapshots[snapshots.length - 1].timestamp)}</span>
            </>
          )}
        </div>
      </div>

      {/* ─── Main ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-(--accent) text-sm mb-2" style={{ animation: "pulse-glow 1.5s infinite" }}>Loading snapshots...</div>
            <span className="text-(--accent)" style={{ animation: "blink 1s step-end infinite" }}>█</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⏪</div>
            <p className="text-(--text-muted) text-sm mb-4">{error}</p>
            <Link href={`/room/session/${roomId}`} className="text-(--accent) text-xs hover:underline no-underline">← Back to session</Link>
          </div>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">📸</div>
            <p className="text-(--text-primary) text-base font-semibold mb-2">No Snapshots Yet</p>
            <p className="text-(--text-muted) text-xs mb-4">Start coding in the session room. Snapshots are automatically captured every 3 minutes, on saves, and when users join or leave.</p>
            <Link href={`/room/session/${roomId}`} className="text-(--accent) text-xs hover:underline no-underline">← Back to session</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* ─── Snapshot List (Left Sidebar) ─────────────────── */}
          <div
            className="w-72 min-w-72 border-r border-(--border-color) flex flex-col overflow-hidden"
            style={{ background: "var(--bg-secondary)" }}
          >
            {/* Prev / Next nav */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-(--border-color)">
              <button
                onClick={() => setSelectedIndex(i => Math.max(0, i - 1))}
                disabled={selectedIndex === 0}
                className="bg-transparent border border-(--border-color) text-(--text-muted) px-2.5 py-1 rounded text-[0.65rem] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:border-(--accent) hover:text-(--accent)"
              >
                ▲ Prev
              </button>
              <span className="text-[0.6rem] text-(--text-muted) tabular-nums">
                {selectedIndex + 1} / {snapshots.length}
              </span>
              <button
                onClick={() => setSelectedIndex(i => Math.min(snapshots.length - 1, i + 1))}
                disabled={selectedIndex >= snapshots.length - 1}
                className="bg-transparent border border-(--border-color) text-(--text-muted) px-2.5 py-1 rounded text-[0.65rem] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:border-(--accent) hover:text-(--accent)"
              >
                Next ▼
              </button>
            </div>

            {/* Scrollable list */}
            <div ref={listRef} className="flex-1 overflow-y-auto py-1">
              {snapshots.map((snap, i) => {
                const meta = TRIGGER_META[snap.trigger] || { label: snap.trigger, icon: "📸", color: "#9ca3af" };
                const isActive = i === selectedIndex;

                return (
                  <button
                    key={snap._id}
                    data-idx={i}
                    onClick={() => setSelectedIndex(i)}
                    className="w-full text-left border-none cursor-pointer transition-all"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      padding: "0.5rem 0.75rem",
                      background: isActive ? "rgba(0,255,65,0.06)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "var(--bg-card)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Top row: icon + trigger label + time */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: "0.75rem" }}>{meta.icon}</span>
                        <span
                          className="text-[0.65rem] font-semibold"
                          style={{ color: isActive ? "var(--accent)" : meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <span
                        className="text-[0.55rem] tabular-nums"
                        style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
                      >
                        {formatTime(snap.timestamp)}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-2 text-[0.55rem] text-(--text-muted)">
                      {snap.username && <span>by {snap.username}</span>}
                      <span>{snap.files.length} file{snap.files.length !== 1 ? "s" : ""}</span>
                      <span>seq #{snap.seq}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Right Side: File Tabs + Editor ───────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* File tabs */}
            {selected && selected.files.length > 1 && (
              <div
                className="flex items-center gap-0 border-b border-(--border-color) overflow-x-auto"
                style={{ background: "var(--bg-secondary)", minHeight: "2rem" }}
              >
                {selected.files.map((file) => {
                  const isFileActive = file.filename === viewingFile;
                  return (
                    <button
                      key={file.filename}
                      onClick={() => {
                        setViewingFile(file.filename);
                        editorRef.current?.setRemoteCode(file.content);
                      }}
                      className="border-none cursor-pointer transition-all whitespace-nowrap"
                      style={{
                        padding: "0.35rem 0.85rem",
                        fontSize: "0.7rem",
                        fontFamily: "inherit",
                        background: isFileActive ? "var(--bg-primary)" : "transparent",
                        color: isFileActive ? "var(--accent)" : "var(--text-muted)",
                        borderBottom: isFileActive ? "2px solid var(--accent)" : "2px solid transparent",
                        fontWeight: isFileActive ? 600 : 400,
                      }}
                    >
                      {file.filename}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Single file indicator */}
            {selected && selected.files.length === 1 && (
              <div
                className="flex items-center px-4 border-b border-(--border-color)"
                style={{ background: "var(--bg-secondary)", minHeight: "2rem" }}
              >
                <span className="text-[0.7rem] text-(--accent) font-semibold">
                  {selected.files[0].filename}
                </span>
              </div>
            )}

            {/* Monaco editor */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <CodeEditor
                ref={editorRef as any}
                language={currentFile?.language || "javascript"}
                initialValue={currentFile?.content || ""}
                onChange={() => {}}
                onCursorChange={() => {}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
