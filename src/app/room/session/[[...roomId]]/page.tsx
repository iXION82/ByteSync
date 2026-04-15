"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import CodeRunner from "@/components/editor/CodeRunner";
import FileTree, { type FileItem } from "@/components/editor/FileTree";
import { LANGUAGES, DEFAULT_LANGUAGE_ID, getLanguageById, inferLanguageFromFilename } from "@/lib/editorConstants";
import { useSocket, type SocketUser, type SocketFile } from "@/hooks/useSocket";
import type { CodeEditorHandle } from "@/components/editor/CodeEditor";

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

interface RoomOwner {
  userId: string;
  clerkId?: string;
  name: string;
  username: string;
}

interface RoomParticipant {
  userId: string;
  clerkId?: string;
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
  owner: RoomOwner | null;
  participants: RoomParticipant[];
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();

  const roomIdStr = params?.roomId
    ? (Array.isArray(params.roomId) ? params.roomId.join("/") : params.roomId)
    : "";

  // Room details (fetched from REST API)
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);

  // Editor state
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const [code, setCode] = useState(
    getLanguageById(DEFAULT_LANGUAGE_ID)?.starterCode || ""
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Multi-file state
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [fileTreeOpen, setFileTreeOpen] = useState(true);

  // Live participants from socket
  const [liveUsers, setLiveUsers] = useState<SocketUser[]>([]);

  // Chat state
  interface ChatMessage {
    _id: string;
    senderId: string;
    message: string;
    createdAt: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Derived DB user ID for the current Clerk user
  const myDbUserId = useMemo(() => {
    if (!user || !roomDetails) return null;
    if (roomDetails.owner?.clerkId === user.id) return roomDetails.owner.userId;
    return roomDetails.participants.find((p) => p.clerkId === user.id)?.userId || null;
  }, [user, roomDetails]);

  // Ref to the CodeEditor imperative handle (for remote code pushes)
  const editorRef = useRef<CodeEditorHandle | null>(null);

  // Flag to suppress emitting code-change when receiving remote updates
  const isRemoteUpdate = useRef(false);

  const currentLang = getLanguageById(languageId)!;
  const isOwner = Boolean(user?.id && roomDetails?.owner?.clerkId === user.id);

  // ─── Fetch room details + chat history on mount ────────────
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

    const fetchChatHistory = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/chats/${roomIdStr}?limit=50`);
        if (res.ok) {
          const messages: ChatMessage[] = await res.json();
          setChatMessages(messages);
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };

    fetchRoom();
    fetchChatHistory();
  }, [roomIdStr]);

  // ─── Socket integration ────────────────────────────────────
  const {
    emitCodeChange, emitLanguageChange, emitSave, emitMessage, emitCursorMove,
    emitCreateFile, emitDeleteFile, emitRenameFile, emitSwitchFile,
  } = useSocket({
    roomId: roomIdStr,
    clerkId: user?.id || "",
    onRoomState: (data) => {
      isRemoteUpdate.current = true;
      setCode(data.code);
      editorRef.current?.setRemoteCode(data.code);
      if (data.codeLanguage) {
        const lang = LANGUAGES.find(l => l.monacoLang === data.codeLanguage || l.id === data.codeLanguage);
        if (lang) setLanguageId(lang.id);
      }
      setLiveUsers(data.users);
      // Load files from room state
      if (data.files && data.files.length > 0) {
        setFiles(data.files.map((f: SocketFile) => ({ filename: f.filename, content: f.content, language: f.language })));
        setActiveFile(data.activeFile || data.files[0].filename);
      }
      setTimeout(() => { isRemoteUpdate.current = false; }, 0);
    },
    onCodeUpdate: (data) => {
      // Only apply if it's for the file we're currently viewing
      if (data.filename && data.filename !== activeFile) return;
      isRemoteUpdate.current = true;
      setCode(data.code);
      editorRef.current?.setRemoteCode(data.code);
      // Also update the files array in memory
      setFiles((prev) => prev.map((f) => f.filename === (data.filename || activeFile) ? { ...f, content: data.code } : f));
      setTimeout(() => { isRemoteUpdate.current = false; }, 0);
    },
    onLanguageUpdate: (data) => {
      isRemoteUpdate.current = true;
      setCode(data.code);
      editorRef.current?.setRemoteCode(data.code);
      const lang = LANGUAGES.find(l => l.monacoLang === data.codeLanguage || l.id === data.codeLanguage);
      if (lang) setLanguageId(lang.id);
      setTimeout(() => { isRemoteUpdate.current = false; }, 0);
    },
    onUserJoined: (data) => {
      setLiveUsers(data.users);
    },
    onUserLeft: (data) => {
      setLiveUsers(data.users);
      editorRef.current?.removeRemoteCursor(data.userId);
    },
    onCodeSaved: (data) => {
      setLastSaved(new Date(data.timestamp).toLocaleTimeString());
    },
    onCursorUpdate: (data) => {
      const userIndex = liveUsers.findIndex(u => u.userId === data.userId);
      let username = "Anonymous";
      if (userIndex !== -1) {
        username = liveUsers[userIndex].username;
      } else {
        const detailsUser = roomDetails?.participants.find(p => p.userId === data.userId);
        if (detailsUser) username = detailsUser.name;
      }
      const colorIndex = userIndex !== -1 ? userIndex : 0;
      editorRef.current?.updateRemoteCursor(data.userId, username, data.line, data.column, colorIndex);
    },
    onNewMessage: (data) => {
      setChatMessages((prev) => [...prev, data]);
    },
    // ─── Multi-file socket callbacks ──────────────────────────
    onFileCreated: (data) => {
      setFiles(data.files.map((f: SocketFile) => ({ filename: f.filename, content: f.content, language: f.language })));
    },
    onFileDeleted: (data) => {
      setFiles(data.files.map((f: SocketFile) => ({ filename: f.filename, content: f.content, language: f.language })));
      // If the deleted file was the one we had open, switch to the new active
      if (activeFile === data.filename) {
        setActiveFile(data.activeFile);
        const switchedFile = data.files.find((f: SocketFile) => f.filename === data.activeFile);
        if (switchedFile) {
          isRemoteUpdate.current = true;
          setCode(switchedFile.content);
          editorRef.current?.setRemoteCode(switchedFile.content);
          const lang = LANGUAGES.find(l => l.monacoLang === switchedFile.language || l.id === switchedFile.language);
          if (lang) setLanguageId(lang.id);
          setTimeout(() => { isRemoteUpdate.current = false; }, 0);
        }
      }
    },
    onFileRenamed: (data) => {
      setFiles(data.files.map((f: SocketFile) => ({ filename: f.filename, content: f.content, language: f.language })));
      // If we had the old name active, switch to the new name
      if (activeFile === data.oldFilename) {
        setActiveFile(data.newFilename);
      }
    },
    onFileSwitched: (data) => {
      // Another user switched the room's active file — update our view too
      // Only auto-switch if it wasn't us who triggered it
      // (our own switch is handled locally already)
    },
  });

  // ─── Auto-scroll chat to bottom on new messages ────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── Send chat message ─────────────────────────────────────
  const handleSendMessage = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    emitMessage(trimmed);
    setChatInput("");
  }, [chatInput, emitMessage]);

  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // ─── Resolve sender name from userId ───────────────────────
  const getSenderName = useCallback((senderId: string) => {
    // Check live users first
    const liveUser = liveUsers.find(u => u.userId === senderId);
    if (liveUser) return liveUser.username;
    // Fallback to room details
    const participant = roomDetails?.participants.find(p => p.userId === senderId);
    if (participant) return participant.name;
    if (roomDetails?.owner?.userId === senderId) return roomDetails.owner.name;
    return "Unknown";
  }, [liveUsers, roomDetails]);

  const getSenderColor = useCallback((senderId: string) => {
    const idx = liveUsers.findIndex(u => u.userId === senderId);
    return PARTICIPANT_COLORS[Math.max(0, idx) % PARTICIPANT_COLORS.length];
  }, [liveUsers]);

  // ─── Code change handler (local edits, debounced emit) ──────
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    // Keep the in-memory files array in sync
    setFiles((prev) => prev.map((f) => f.filename === activeFile ? { ...f, content: newCode } : f));

    // Only emit to socket if this is a local edit (not a remote update)
    if (!isRemoteUpdate.current) {
      // Debounce: wait 150ms after last keystroke before sending
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        emitCodeChange(newCode, currentLang.monacoLang, activeFile);
      }, 150);
    }
  }, [emitCodeChange, currentLang, activeFile]);

  // ─── Multi-file action handlers ────────────────────────────
  const handleSwitchFile = useCallback((filename: string) => {
    if (filename === activeFile) return;
    // Save current file content in memory before switching
    const targetFile = files.find((f) => f.filename === filename);
    if (!targetFile) return;

    setActiveFile(filename);
    isRemoteUpdate.current = true;
    setCode(targetFile.content);
    editorRef.current?.setRemoteCode(targetFile.content);

    // Update language to match the file
    const lang = LANGUAGES.find(l => l.monacoLang === targetFile.language || l.id === targetFile.language);
    if (lang) setLanguageId(lang.id);

    emitSwitchFile(filename);
    setTimeout(() => { isRemoteUpdate.current = false; }, 0);
  }, [activeFile, files, emitSwitchFile]);

  const handleCreateFile = useCallback((filename: string, language: string) => {
    emitCreateFile(filename, language);
  }, [emitCreateFile]);

  const handleDeleteFile = useCallback((filename: string) => {
    emitDeleteFile(filename);
  }, [emitDeleteFile]);

  const handleRenameFile = useCallback((oldFilename: string, newFilename: string) => {
    emitRenameFile(oldFilename, newFilename);
  }, [emitRenameFile]);

  // ─── Language change handler ───────────────────────────────
  const handleLanguageChange = useCallback((newLangId: string) => {
    if (!isOwner) {
      alert("Only the room owner can change the language.");
      return;
    }

    const confirmChange = window.confirm("Changing the language will overwrite the existing code in the room for everyone. Are you sure you want to proceed?");
    if (!confirmChange) return;

    setLanguageId(newLangId);
    const lang = getLanguageById(newLangId);
    if (lang) {
      setCode(lang.starterCode);
      editorRef.current?.setCode(lang.starterCode);
      emitLanguageChange(lang.monacoLang, lang.starterCode);
      // Update active file in files array
      setFiles((prev) => prev.map((f) => f.filename === activeFile ? { ...f, content: lang.starterCode, language: lang.monacoLang } : f));
    }
    setOutput("");
    setError("");
    setExecutionTime(null);
  }, [emitLanguageChange, isOwner, activeFile]);

  // ─── Run code ──────────────────────────────────────────────
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

  const handleSaveCode = useCallback(() => {
    emitSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, [emitSave]);

  const handleClearOutput = useCallback(() => {
    setOutput("");
    setError("");
    setExecutionTime(null);
  }, []);

  const handleLeaveRoom = async () => {
    if (!user || !roomIdStr) return;
    // Save before leaving
    emitSave();
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-screen pt-16 bg-background overflow-hidden w-full">
      {/* Toolbar Area */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-0 h-auto sm:h-13 min-h-13 bg-(--bg-secondary) border-b border-(--border-color) gap-2 sm:gap-4 z-10 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-[0.4rem] font-mono text-base sm:text-[1.2rem] text-(--accent) whitespace-nowrap">
            {/* File tree toggle */}
            <button
              onClick={() => setFileTreeOpen((v) => !v)}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-(--border-color) text-(--text-muted) hover:text-(--accent) hover:border-(--accent) bg-transparent cursor-pointer transition-all duration-150 active:scale-[0.95] mr-1"
              title={fileTreeOpen ? "Hide file tree" : "Show file tree"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>SESSION_ROOM</span>
            {/* Live indicator */}
            <span
              className="w-2 h-2 rounded-full ml-1"
              style={{ background: "#22c55e", animation: "badge-pulse 2s infinite" }}
              title="Connected"
            />
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-[0.4rem]">
            <label className="font-sans text-[0.7rem] font-semibold text-(--text-muted) tracking-[0.06em] uppercase" htmlFor="lang-select">LANG:</label>
            <select
              id="lang-select"
              className="font-sans text-[0.8rem] font-medium text-foreground bg-(--bg-card) border border-(--border-color) rounded-md py-[0.35rem] px-[0.6rem] outline-none cursor-pointer transition-all duration-200 appearance-auto focus:border-(--accent) focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              value={languageId}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={!isOwner}
              title={!isOwner ? "Only the room owner can change the language" : "Change room language"}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id} className="bg-background text-foreground">
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save button */}
          <button
            className={`flex items-center gap-[0.35rem] font-mono text-[1.05rem] font-normal py-[0.3rem] px-[0.9rem] rounded-md cursor-pointer transition-all duration-200 border whitespace-nowrap tracking-[0.02em] active:scale-[0.97] ${
              justSaved 
                ? "border-green-500/50 text-green-400 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.2)]" 
                : "border-(--border-color) text-(--text-muted) bg-transparent hover:border-(--border-hover) hover:bg-(--bg-card)"
            }`}
            onClick={handleSaveCode}
            title="Save code to database"
          >
            {justSaved ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            )}
            {justSaved ? "SAVED" : "SAVE"}
          </button>
          <button
            className="flex items-center gap-[0.35rem] font-mono text-[1.05rem] font-normal py-[0.3rem] px-[0.9rem] rounded-md cursor-pointer transition-all duration-200 border border-(--border-color) whitespace-nowrap tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed bg-transparent text-(--text-muted) active:scale-[0.97] hover:border-(--border-hover) hover:bg-(--bg-card)"
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
            className="flex items-center gap-[0.35rem] font-mono text-[1.05rem] font-normal py-[0.3rem] px-[0.9rem] rounded-md cursor-pointer transition-all duration-200 border border-transparent whitespace-nowrap tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed text-(--btn-primary-text) active:scale-[0.97] hover:-translate-y-px"
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

      {/* Main Content Area: FileTree + Editor + Right Panel */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* File Tree Sidebar */}
        {fileTreeOpen && (
          <div className="hidden md:flex w-[11rem] min-w-[11rem] max-w-[14rem] h-full flex-shrink-0 border-r border-(--border-color)">
            <FileTree
              files={files}
              activeFile={activeFile}
              isOwner={isOwner}
              onSwitchFile={handleSwitchFile}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
            />
          </div>
        )}

        {/* Code Editor */}
        <div className="h-[55%] md:h-auto md:flex-1 min-w-0 overflow-hidden border-b md:border-b-0 border-(--border-color)">
          <CodeEditor
            ref={editorRef}
            language={currentLang.monacoLang}
            initialValue={code}
            onChange={handleCodeChange}
            onCursorChange={emitCursorMove}
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
            <div className="flex-1 border border-(--border-color) rounded-md flex flex-col text-(--text-muted) text-sm bg-background overflow-hidden">
              <div ref={chatContainerRef} className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden p-3 scroll-smooth">
                {chatMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-(--text-muted) opacity-50">
                    No messages yet — start the conversation!
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {chatMessages.map((msg) => {
                      const isMe = Boolean(myDbUserId && msg.senderId === myDbUserId);
                      
                      const senderName = getSenderName(msg.senderId);
                      const color = getSenderColor(msg.senderId);
                      const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          key={msg._id}
                          className={`flex flex-col gap-0.5 py-1.5 px-3 rounded-xl transition-colors duration-150 mb-1 max-w-[85%] ${
                            isMe
                              ? "self-end items-end bg-(--bg-card) border border-(--accent)/50 text-foreground rounded-br-none shadow-[0_2px_8px_var(--accent-glow)]"
                              : "self-start items-start bg-(--bg-secondary) border border-(--border-color) rounded-bl-none"
                          }`}
                        >
                        <div className={`flex items-center gap-2 flex-wrap ${isMe ? "flex-row-reverse" : ""}`}>
                          <span
                            className="text-[11px] font-bold font-mono"
                            style={{ color: isMe ? "var(--accent)" : color.text }}
                          >
                            {isMe ? "You" : senderName}
                          </span>
                          <span className="text-[9px] text-(--text-muted) opacity-60 font-mono">{time}</span>
                        </div>
                          <p className={`text-[12px] leading-relaxed break-words m-0 ${isMe ? "text-right" : "text-left"}`}>
                            {msg.message}
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 p-2 border-t border-(--border-color) bg-(--bg-secondary)">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-background border border-(--border-color) rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-(--accent) transition-colors duration-200"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  maxLength={500}
                />
                <button
                  className="bg-(--accent) text-background px-3 rounded font-medium text-xs shadow-[0_0_8px_var(--accent-glow)] cursor-pointer transition-all duration-200 active:scale-[0.95] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                >
                  SEND
                </button>
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

          {/* Live Participants */}
          <div className="flex flex-col h-full justify-center">
            <span className="text-[0.65rem] text-(--text-muted) font-mono uppercase tracking-wider mb-1">
              LIVE ({liveUsers.length})
            </span>
            <div className="flex items-center gap-4">
              <AnimatePresence>
                {liveUsers.map((u, i) => {
                  const color = PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length];
                  const isMe = Boolean(myDbUserId && u.userId === myDbUserId);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -20, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      key={u.socketId}
                      className="flex items-center gap-2"
                    >
                      <div className="relative">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                          style={{
                            background: isMe ? "rgba(var(--accent-rgb, 0,255,136), 0.2)" : color.bg,
                            border: `1px solid ${isMe ? "var(--accent)" : color.border}`,
                            color: isMe ? "var(--accent)" : color.text,
                          }}
                        >
                          {getInitials(u.username)}
                        </div>
                        {/* Online dot */}
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-(--bg-secondary)"
                          style={{ background: "#22c55e" }}
                        />
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[13px] font-medium text-foreground">
                          {isMe ? "You" : u.username}
                        </span>
                        <span className="text-[9px] text-(--text-muted) uppercase font-mono">Online</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {liveUsers.length === 0 && (
                <span className="text-xs text-(--text-muted)">Connecting...</span>
              )}
            </div>
          </div>

          {/* Last saved */}
          {lastSaved && (
            <>
              <div className="w-px h-8 bg-(--border-color) mx-2 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-[0.65rem] text-(--text-muted) font-mono uppercase tracking-wider">SAVED</span>
                <span className="text-xs text-(--text-muted) font-mono mt-1">{lastSaved}</span>
              </div>
            </>
          )}
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
