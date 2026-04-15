"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface EditEvent {
  _id: string;
  timestamp: string;
  filename: string;
  content: string;
  afterSnapshotSeq: number;
  username?: string;
}

interface ReplayEntry {
  type: "snapshot" | "edit";
  timestamp: Date;
  snapshot?: Snapshot;
  editEvent?: EditEvent;
  label: string;
}

interface SessionReplayProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyState: (code: string, language: string, filename: string) => void;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

const TRIGGER_LABELS: Record<string, string> = {
  auto: "Auto-save",
  manual: "Manual save",
  join: "User joined",
  leave: "User left",
  "file-change": "File changed",
  "language-change": "Language changed",
};

const TRIGGER_ICONS: Record<string, string> = {
  auto: "💾",
  manual: "📌",
  join: "👤",
  leave: "👋",
  "file-change": "📄",
  "language-change": "🔤",
};

// ─── Component ──────────────────────────────────────────────────

export default function SessionReplay({ roomId, isOpen, onClose, onApplyState }: SessionReplayProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [timeline, setTimeline] = useState<ReplayEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");
  const [previewFile, setPreviewFile] = useState("");
  const playTimer = useRef<NodeJS.Timeout | null>(null);

  // ─── Load replay data ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !roomId) return;

    const loadReplayData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all snapshots
        const snapRes = await fetch(`${SERVER_URL}/api/rooms/${roomId}/replay/snapshots`);
        if (!snapRes.ok) throw new Error("Failed to fetch snapshots");
        const snapData = await snapRes.json();
        const snaps: Snapshot[] = snapData.snapshots;
        setSnapshots(snaps);

        if (snaps.length === 0) {
          setError("No replay data available yet. Start coding to begin recording!");
          setLoading(false);
          return;
        }

        // Build unified timeline from snapshots + edit events
        const entries: ReplayEntry[] = [];

        for (const snap of snaps) {
          entries.push({
            type: "snapshot",
            timestamp: new Date(snap.timestamp),
            snapshot: snap,
            label: `${TRIGGER_ICONS[snap.trigger] || "📸"} ${TRIGGER_LABELS[snap.trigger] || snap.trigger}${snap.username ? ` — ${snap.username}` : ""}`,
          });
        }

        // Fetch edit events for the latest span (between first and last snapshot)
        if (snaps.length > 0) {
          const eventsRes = await fetch(`${SERVER_URL}/api/rooms/${roomId}/replay/events?afterSeq=0&limit=5000`);
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            const events: EditEvent[] = eventsData.events;

            for (const evt of events) {
              entries.push({
                type: "edit",
                timestamp: new Date(evt.timestamp),
                editEvent: evt,
                label: `✏️ Edit: ${evt.filename}${evt.username ? ` — ${evt.username}` : ""}`,
              });
            }
          }
        }

        // Sort by timestamp
        entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setTimeline(entries);
        setCurrentIndex(0);

        // Set initial preview
        if (entries.length > 0) {
          applyEntry(entries[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load replay data");
      } finally {
        setLoading(false);
      }
    };

    loadReplayData();
  }, [isOpen, roomId]);

  // ─── Apply an entry to the preview ────────────────────────────
  const applyEntry = useCallback((entry: ReplayEntry) => {
    if (entry.type === "snapshot" && entry.snapshot) {
      const file = entry.snapshot.files.find(f => f.filename === entry.snapshot!.activeFile) || entry.snapshot.files[0];
      if (file) {
        setPreviewCode(file.content);
        setPreviewFile(file.filename);
      }
    } else if (entry.type === "edit" && entry.editEvent) {
      setPreviewCode(entry.editEvent.content);
      setPreviewFile(entry.editEvent.filename);
    }
  }, []);

  // ─── Playback controls ────────────────────────────────────────
  const play = useCallback(() => {
    if (currentIndex >= timeline.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [currentIndex, timeline.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (playTimer.current) {
      clearTimeout(playTimer.current);
      playTimer.current = null;
    }
  }, []);

  const stepForward = useCallback(() => {
    setCurrentIndex(prev => {
      const next = Math.min(prev + 1, timeline.length - 1);
      applyEntry(timeline[next]);
      return next;
    });
  }, [timeline, applyEntry]);

  const stepBack = useCallback(() => {
    setCurrentIndex(prev => {
      const next = Math.max(prev - 1, 0);
      applyEntry(timeline[next]);
      return next;
    });
  }, [timeline, applyEntry]);

  const jumpTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, timeline.length - 1));
    setCurrentIndex(clamped);
    applyEntry(timeline[clamped]);
  }, [timeline, applyEntry]);

  // ─── Auto-play loop ───────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    if (currentIndex >= timeline.length - 1) {
      setIsPlaying(false);
      return;
    }

    // Calculate delay between entries based on real time, clamped to useful range
    const current = timeline[currentIndex];
    const next = timeline[currentIndex + 1];
    const realDeltaMs = next.timestamp.getTime() - current.timestamp.getTime();
    // Clamp: min 50ms, max 2000ms, scaled by play speed
    const delay = Math.max(50, Math.min(2000, realDeltaMs)) / playSpeed;

    playTimer.current = setTimeout(() => {
      setCurrentIndex(prev => {
        const nextIdx = prev + 1;
        applyEntry(timeline[nextIdx]);
        return nextIdx;
      });
    }, delay);

    return () => {
      if (playTimer.current) clearTimeout(playTimer.current);
    };
  }, [isPlaying, currentIndex, timeline, playSpeed, applyEntry]);

  // ─── Format timestamp for display ─────────────────────────────
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (!isOpen) return null;

  const currentEntry = timeline[currentIndex];
  const totalDuration = timeline.length > 1
    ? timeline[timeline.length - 1].timestamp.getTime() - timeline[0].timestamp.getTime()
    : 0;
  const currentPosition = currentEntry
    ? currentEntry.timestamp.getTime() - (timeline[0]?.timestamp.getTime() || 0)
    : 0;
  const snapshotMarkers = timeline
    .map((e, i) => (e.type === "snapshot" ? i : -1))
    .filter(i => i >= 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{
          position: "fixed",
          bottom: "5.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(90vw, 800px)",
          zIndex: 100,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 20px var(--accent-glow)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.6rem 1rem",
              borderBottom: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem" }}>⏪</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Session Replay
              </span>
              {timeline.length > 0 && (
                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                  {timeline.length} events • {formatDuration(totalDuration)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "1rem",
                padding: "2px 6px",
                borderRadius: "4px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              <span style={{ color: "var(--accent)", animation: "blink 1s step-end infinite" }}>█</span> Loading replay data...
            </div>
          ) : error ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              {error}
            </div>
          ) : timeline.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              No replay data available yet.
            </div>
          ) : (
            <>
              {/* Code Preview */}
              <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border-color)", maxHeight: "200px", overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.6rem", color: "var(--accent)", fontWeight: 600 }}>
                    {previewFile}
                  </span>
                  <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>
                    {currentEntry && formatTime(currentEntry.timestamp)}
                  </span>
                </div>
                <pre
                  style={{
                    fontSize: "0.65rem",
                    lineHeight: 1.5,
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    margin: 0,
                    maxHeight: "150px",
                    overflow: "auto",
                  }}
                >
                  {previewCode || "(empty)"}
                </pre>
              </div>

              {/* Timeline Slider */}
              <div style={{ padding: "0.6rem 1rem" }}>
                {/* Slider Track */}
                <div style={{ position: "relative", marginBottom: "0.3rem" }}>
                  <input
                    type="range"
                    min={0}
                    max={timeline.length - 1}
                    value={currentIndex}
                    onChange={(e) => jumpTo(parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      appearance: "none",
                      height: "6px",
                      borderRadius: "3px",
                      background: `linear-gradient(to right, var(--accent) ${(currentIndex / Math.max(1, timeline.length - 1)) * 100}%, var(--bg-card) ${(currentIndex / Math.max(1, timeline.length - 1)) * 100}%)`,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />
                  {/* Snapshot markers on the track */}
                  <div style={{ position: "absolute", top: "0", left: "0", right: "0", height: "6px", pointerEvents: "none" }}>
                    {snapshotMarkers.map((idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "absolute",
                          left: `${(idx / Math.max(1, timeline.length - 1)) * 100}%`,
                          top: "-2px",
                          width: "3px",
                          height: "10px",
                          background: "var(--accent)",
                          borderRadius: "1px",
                          opacity: 0.6,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Time labels */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.55rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  <span>{formatDuration(currentPosition)}</span>
                  <span>{currentEntry?.label}</span>
                  <span>{formatDuration(totalDuration)}</span>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  {/* Step back */}
                  <button
                    onClick={stepBack}
                    disabled={currentIndex === 0}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-muted)",
                      cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.7rem",
                      opacity: currentIndex === 0 ? 0.4 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    ⏮
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={isPlaying ? pause : play}
                    style={{
                      background: "var(--btn-primary-bg)",
                      border: "1px solid transparent",
                      color: "var(--btn-primary-text)",
                      cursor: "pointer",
                      padding: "5px 16px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      boxShadow: "0 0 12px var(--accent-glow)",
                      transition: "all 0.15s",
                    }}
                  >
                    {isPlaying ? "⏸ Pause" : "▶ Play"}
                  </button>

                  {/* Step forward */}
                  <button
                    onClick={stepForward}
                    disabled={currentIndex >= timeline.length - 1}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-muted)",
                      cursor: currentIndex >= timeline.length - 1 ? "not-allowed" : "pointer",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.7rem",
                      opacity: currentIndex >= timeline.length - 1 ? 0.4 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    ⏭
                  </button>

                  {/* Divider */}
                  <div style={{ width: "1px", height: "16px", background: "var(--border-color)", margin: "0 0.3rem" }} />

                  {/* Speed selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {[0.5, 1, 2, 4].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaySpeed(speed)}
                        style={{
                          background: playSpeed === speed ? "var(--accent)" : "none",
                          border: `1px solid ${playSpeed === speed ? "var(--accent)" : "var(--border-color)"}`,
                          color: playSpeed === speed ? "var(--bg-primary)" : "var(--text-muted)",
                          cursor: "pointer",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "0.55rem",
                          fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ width: "1px", height: "16px", background: "var(--border-color)", margin: "0 0.3rem" }} />

                  {/* Apply to editor */}
                  <button
                    onClick={() => {
                      if (currentEntry?.type === "snapshot" && currentEntry.snapshot) {
                        const file = currentEntry.snapshot.files.find(f => f.filename === currentEntry.snapshot!.activeFile) || currentEntry.snapshot.files[0];
                        if (file) onApplyState(file.content, file.language, file.filename);
                      } else if (currentEntry?.type === "edit" && currentEntry.editEvent) {
                        onApplyState(currentEntry.editEvent.content, "", currentEntry.editEvent.filename);
                      }
                      onClose();
                    }}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      transition: "all 0.15s",
                      letterSpacing: "0.04em",
                    }}
                    title="Restore code to this point in time"
                    onMouseEnter={e => {
                      e.currentTarget.style.color = "var(--accent)";
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.borderColor = "var(--border-color)";
                    }}
                  >
                    ↩ RESTORE
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
