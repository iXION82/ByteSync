"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import CodeRunner from "@/components/editor/CodeRunner";
import { LANGUAGES, DEFAULT_LANGUAGE_ID, getLanguageById } from "@/lib/editorConstants";

// Dynamic import Monaco to avoid SSR issues
const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center gap-2 h-full bg-background font-sans text-[0.9rem] text-(--text-muted)">
      <span className="text-(--accent)">{'>'} Loading editor...</span>
      <span className="text-(--accent)" style={{ animation: "blink 1s step-end infinite" }}>█</span>
    </div>
  ),
});

const EXECUTE_API = "/api/execute";
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

// Participant color palette
const PARTICIPANT_COLORS = [
  { bg: "rgba(99, 102, 241, 0.2)", border: "#818cf8", text: "#818cf8" },
  { bg: "rgba(16, 185, 129, 0.2)", border: "#34d399", text: "#34d399" },
  { bg: "rgba(245, 158, 11, 0.2)", border: "#fbbf24", text: "#fbbf24" },
  { bg: "rgba(236, 72, 153, 0.2)", border: "#f472b6", text: "#f472b6" },
  { bg: "rgba(139, 92, 246, 0.2)", border: "#a78bfa", text: "#a78bfa" },
];

interface Participant {
  userId: string;
  role: string;
  name: string;
  username: string;
}

interface RoomDetails {
  _id: string;
  roomCode: string;
  codeLanguage: string;
  code: string;
  isActive: boolean;
  owner: { userId: string; name: string; username: string } | null;
  participants: Participant[];
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();

  const roomIdStr = params?.roomId
    ? (Array.isArray(params.roomId) ? params.roomId.join("/") : params.roomId)
    : "";

  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);

  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const [code, setCode] = useState(
    getLanguageById(DEFAULT_LANGUAGE_ID)?.starterCode || ""
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const currentLang = getLanguageById(languageId)!;

  // Fetch room details on mount
  useEffect(() => {
    if (!roomIdStr) return;

    const fetchRoom = async () => {
      setRoomLoading(true);
      try {
        const res = await fetch(`${SERVER_URL}/api/rooms/details/${roomIdStr}`);
        if (res.ok) {
          const data: RoomDetails = await res.json();
          setRoomDetails(data);

          // Set initial code and language from room data
          if (data.code) setCode(data.code);
          if (data.codeLanguage) {
            const lang = LANGUAGES.find(l => l.monacoLang === data.codeLanguage || l.id === data.codeLanguage);
            if (lang) setLanguageId(lang.id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch room:", err);
      } finally {
        setRoomLoading(false);
      }
    };

    fetchRoom();
  }, [roomIdStr]);

  const handleLanguageChange = useCallback((newLangId: string) => {
    setLanguageId(newLangId);
    const lang = getLanguageById(newLangId);
    if (lang) {
      setCode(lang.starterCode);
    }
    setOutput("");
    setError("");
    setExecutionTime(null);
  }, []);

  const handleRunCode = useCallback(async () => {
    setIsRunning(true);
    setOutput("");
    setError("");
    setExecutionTime(null);

    const startTime = performance.now();

    try {
      const response = await fetch(EXECUTE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: currentLang.pistonLang,
          code,
        }),
      });

      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `API error: ${response.status}`);
      }

      const data = await response.json();

      const stdout = data.stdout || "";
      const stderr = data.stderr || "";
      const compileErr = data.compile_output || "";

      if (compileErr) {
        setError(compileErr);
      } else if (stderr) {
        setError(stderr);
      }
      if (stdout) {
        setOutput(stdout);
      }
      if (!stdout && !stderr && !compileErr) {
        setOutput("Program executed successfully with no output.");
      }
    } catch (err) {
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to execution engine."
      );
    } finally {
      setIsRunning(false);
    }
  }, [code, currentLang]);

  const handleClearOutput = useCallback(() => {
    setOutput("");
    setError("");
    setExecutionTime(null);
  }, []);

  const handleLeaveRoom = async () => {
    if (!user || !roomIdStr) return;
    try {
      await fetch(`${SERVER_URL}/api/rooms/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id, roomId: roomIdStr }),
      });
    } catch (err) {
      console.error("Error leaving room:", err);
    }
    router.push("/dashboard");
  };

  const handleCopyCode = () => {
    if (!roomDetails) return;
    navigator.clipboard.writeText(roomDetails.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if current user is owner
  const isOwner = user && roomDetails?.owner?.userId &&
    roomDetails.owner.userId === (roomDetails as RoomDetails & { ownerId?: string }).ownerId?.toString();

  return (
    <div className="flex flex-col h-screen pt-16 bg-background overflow-hidden w-full">
      {/* Toolbar Area */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-0 h-auto sm:h-13 min-h-13 bg-(--bg-secondary) border-b border-(--border-color) gap-2 sm:gap-4 z-10 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-[0.4rem] font-mono text-base sm:text-[1.2rem] text-(--accent) whitespace-nowrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>SESSION_ROOM</span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-[0.4rem]">
            <label className="font-sans text-[0.7rem] font-semibold text-(--text-muted) tracking-[0.06em] uppercase" htmlFor="lang-select">LANG:</label>
            <select
              id="lang-select"
              className="font-sans text-[0.8rem] font-medium text-foreground bg-(--bg-card) border border-(--border-color) rounded-md py-[0.35rem] px-[0.6rem] outline-none cursor-pointer transition-all duration-200 appearance-auto focus:border-(--accent) focus:ring-2"
              value={languageId}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-[0.35rem] font-mono text-[1.05rem] font-normal py-[0.3rem] px-[0.9rem] rounded-md cursor-pointer transition-all duration-200 border border-(--border-color) whitespace-nowrap tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed bg-transparent text-(--text-muted) hover:border-(--border-hover) hover:bg-(--bg-card)"
            onClick={handleClearOutput}
            disabled={isRunning}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            CLEAR
          </button>
          <button
            className="flex items-center gap-[0.35rem] font-mono text-[1.05rem] font-normal py-[0.3rem] px-[0.9rem] rounded-md cursor-pointer transition-all duration-200 border border-transparent whitespace-nowrap tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed text-(--btn-primary-text) hover:-translate-y-px"
            style={{ background: "var(--btn-primary-bg)", boxShadow: "0 0 12px var(--accent-glow)" }}
            onClick={handleRunCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-(--btn-primary-text) border-t-transparent rounded-full" style={{ animation: "spin 0.6s linear infinite" }} />
                RUNNING...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                RUN
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area: Editor + Right Panel */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Code Editor */}
        <div className="h-[55%] md:h-auto md:flex-1 min-w-0 overflow-hidden border-b md:border-b-0 border-(--border-color)">
          <CodeEditor
            language={currentLang.monacoLang}
            value={code}
            onChange={setCode}
          />
        </div>

        <div className="h-[45%] md:h-auto w-full md:w-[40%] min-w-0 md:min-w-80 max-w-none md:max-w-125 overflow-hidden flex flex-col md:border-l border-(--border-color)">
          <div className="flex-1 overflow-hidden flex flex-col border-b border-(--border-color)">
            <CodeRunner
              output={output}
              isRunning={isRunning}
              error={error}
              executionTime={executionTime}
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-(--bg-card) p-4">
            <h3 className="text-(--text-muted) font-mono text-sm mb-2 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              CHAT
            </h3>
            <div className="flex-1 border border-(--border-color) rounded-md flex flex-col justify-end text-(--text-muted) text-sm bg-background p-3">
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-3 opacity-50">
                <div className="text-center text-xs py-4">Chat coming soon...</div>
              </div>
              <div className="flex gap-2 mt-auto">
                <input type="text" placeholder="Chat is disabled currently..." className="flex-1 bg-(--bg-secondary) border border-(--border-color) rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-(--accent) disabled:opacity-50" disabled />
                <button className="bg-(--accent) text-background px-3 rounded font-medium text-xs shadow-[0_0_8px_var(--accent-glow)] disabled:opacity-50" disabled>SEND</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar — Room Info & Participants */}
      <div className="h-16 sm:h-20 min-h-16 sm:min-h-20 bg-(--bg-secondary) border-t border-(--border-color) px-4 py-2 flex items-center justify-between z-10 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 h-full min-w-max">
          {/* Room Code */}
          <div className="flex flex-col">
            <span className="text-xs text-(--text-muted) font-mono uppercase tracking-wider">ROOM CODE</span>
            <div className="flex items-center gap-2 mt-1">
              {roomLoading ? (
                <span className="text-sm text-(--text-muted) font-mono">Loading...</span>
              ) : (
                <>
                  <span className="text-lg font-bold text-(--accent) font-mono bg-(--bg-card) px-3 py-1 rounded border border-(--border-color)">
                    {roomDetails?.roomCode || roomIdStr}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-[10px] font-mono text-(--text-muted) hover:text-(--accent) border border-(--border-color) hover:border-(--accent) bg-(--bg-card) px-2 py-1 rounded transition-all cursor-pointer"
                    title="Copy room code"
                  >
                    {copied ? "COPIED!" : "COPY"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-(--border-color) mx-2 hidden sm:block" />

          {/* Participants */}
          <div className="flex flex-col h-full justify-center">
            <span className="text-[0.65rem] text-(--text-muted) font-mono uppercase tracking-wider mb-1">
              PARTICIPANTS ({roomLoading ? "..." : (roomDetails?.participants?.length || 0) + (roomDetails?.owner ? 1 : 0)})
            </span>
            <div className="flex items-center gap-4">
              {roomLoading ? (
                <span className="text-xs text-(--text-muted)">Loading...</span>
              ) : (
                <>
                  {/* Owner */}
                  {roomDetails?.owner && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-[0_0_5px_var(--accent-glow)]"
                        style={{
                          background: "rgba(var(--accent-rgb, 0,255,136), 0.2)",
                          border: "1px solid var(--accent)",
                          color: "var(--accent)",
                        }}
                      >
                        {getInitials(roomDetails.owner.name || roomDetails.owner.username)}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[13px] font-medium text-foreground">
                          {user && roomDetails.owner.userId === user.id
                            ? "You"
                            : roomDetails.owner.name || roomDetails.owner.username}
                        </span>
                        <span className="text-[9px] text-(--text-muted) uppercase font-mono">Owner</span>
                      </div>
                    </div>
                  )}

                  {/* Allowed Users */}
                  {roomDetails?.participants?.map((p, i) => {
                    const color = PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length];
                    const isMe = user && p.userId === user.id;
                    return (
                      <div key={p.userId} className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                          style={{
                            background: color.bg,
                            border: `1px solid ${color.border}`,
                            color: color.text,
                          }}
                        >
                          {getInitials(p.name || p.username)}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[13px] font-medium text-foreground">
                            {isMe ? "You" : p.name || p.username}
                          </span>
                          <span className="text-[9px] text-(--text-muted) uppercase font-mono">
                            {p.role}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state */}
                  {!roomDetails?.participants?.length && !roomDetails?.owner && (
                    <span className="text-xs text-(--text-muted)">No participants yet</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Leave Room */}
        <div className="flex items-center ml-4">
          <button
            onClick={handleLeaveRoom}
            className="text-[11px] font-mono font-medium text-(--text-muted) hover:text-red-400 border border-(--border-color) hover:border-red-400/50 bg-(--bg-card) px-3 py-1.5 rounded transition-all hidden sm:block cursor-pointer"
          >
            LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
