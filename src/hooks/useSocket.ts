import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

// ─── Types ──────────────────────────────────────────────────────

export interface SocketFile {
  filename: string;
  content: string;
  language: string;
}

export interface SocketUser {
  socketId: string;
  username: string;
  userId: string;
}

interface UseSocketOptions {
  roomId: string;
  clerkId: string;
  onRoomState?: (data: {
    code: string;
    codeLanguage: string;
    users: SocketUser[];
    files?: SocketFile[];
    activeFile?: string;
  }) => void;
  onCodeUpdate?: (data: { code: string; codeLanguage?: string; userId: string; filename?: string }) => void;
  onLanguageUpdate?: (data: { codeLanguage: string; code: string; userId: string }) => void;
  onUserJoined?: (data: { userId: string; username: string; users: SocketUser[] }) => void;
  onUserLeft?: (data: { userId: string; users: SocketUser[] }) => void;
  onCodeSaved?: (data: { timestamp: string }) => void;
  onCursorUpdate?: (data: { userId: string; line: number; column: number }) => void;
  onNewMessage?: (data: { _id: string; senderId: string; message: string; createdAt: string }) => void;
  // ─── Multi-file events ─────────────────────────────────────
  onFileCreated?: (data: {
    filename: string;
    language: string;
    content: string;
    files: SocketFile[];
    userId: string;
  }) => void;
  onFileDeleted?: (data: {
    filename: string;
    files: SocketFile[];
    activeFile: string;
    userId: string;
  }) => void;
  onFileRenamed?: (data: {
    oldFilename: string;
    newFilename: string;
    files: SocketFile[];
    activeFile: string;
    userId: string;
  }) => void;
  onFileSwitched?: (data: {
    filename: string;
    content: string;
    language: string;
    userId: string;
  }) => void;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useSocket({
  roomId,
  clerkId,
  onRoomState,
  onCodeUpdate,
  onLanguageUpdate,
  onUserJoined,
  onUserLeft,
  onCodeSaved,
  onCursorUpdate,
  onNewMessage,
  onFileCreated,
  onFileDeleted,
  onFileRenamed,
  onFileSwitched,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const callbacksRef = useRef({
    onRoomState, onCodeUpdate, onLanguageUpdate,
    onUserJoined, onUserLeft, onCodeSaved, onCursorUpdate, onNewMessage,
    onFileCreated, onFileDeleted, onFileRenamed, onFileSwitched,
  });
  callbacksRef.current = {
    onRoomState, onCodeUpdate, onLanguageUpdate,
    onUserJoined, onUserLeft, onCodeSaved, onCursorUpdate, onNewMessage,
    onFileCreated, onFileDeleted, onFileRenamed, onFileSwitched,
  };

  useEffect(() => {
    if (!roomId || !clerkId) return;

    const socket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      socket.emit("join-room", { roomId, clerkId });
    });

    // Existing events
    socket.on("room-state", (data) => callbacksRef.current.onRoomState?.(data));
    socket.on("code-update", (data) => callbacksRef.current.onCodeUpdate?.(data));
    socket.on("language-update", (data) => callbacksRef.current.onLanguageUpdate?.(data));
    socket.on("user-joined", (data) => callbacksRef.current.onUserJoined?.(data));
    socket.on("user-left", (data) => callbacksRef.current.onUserLeft?.(data));
    socket.on("code-saved", (data) => callbacksRef.current.onCodeSaved?.(data));
    socket.on("cursor-update", (data) => callbacksRef.current.onCursorUpdate?.(data));
    socket.on("new-message", (data) => callbacksRef.current.onNewMessage?.(data));

    // Multi-file events
    socket.on("file-created", (data) => callbacksRef.current.onFileCreated?.(data));
    socket.on("file-deleted", (data) => callbacksRef.current.onFileDeleted?.(data));
    socket.on("file-renamed", (data) => callbacksRef.current.onFileRenamed?.(data));
    socket.on("file-switched", (data) => callbacksRef.current.onFileSwitched?.(data));

    socket.on("error", (data) => console.error("Socket error:", data.message));
    socket.on("disconnect", () => console.log("🔌 Socket disconnected"));

    return () => {
      socket.emit("leave-room");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, clerkId]);

  // ─── Existing emitters ────────────────────────────────────────

  const emitCodeChange = useCallback((code: string, codeLanguage?: string, filename?: string) => {
    socketRef.current?.emit("code-change", { code, codeLanguage, filename });
  }, []);

  const emitLanguageChange = useCallback((codeLanguage: string, code: string) => {
    socketRef.current?.emit("language-change", { codeLanguage, code });
  }, []);

  const emitSave = useCallback(() => {
    socketRef.current?.emit("save-code");
  }, []);

  const emitMessage = useCallback((message: string) => {
    socketRef.current?.emit("send-message", { message });
  }, []);

  const cursorEmitThrottle = useRef<{ timer: ReturnType<typeof setTimeout> | null; pending: { line: number; column: number } | null }>({ timer: null, pending: null });

  const emitCursorMove = useCallback((line: number, column: number) => {
    const state = cursorEmitThrottle.current;
    state.pending = { line, column };

    if (state.timer) return; // throttle window active, pending will be sent

    // Send immediately
    socketRef.current?.emit("cursor-move", { line, column });
    state.pending = null;

    // Start throttle window
    state.timer = setTimeout(() => {
      if (state.pending) {
        socketRef.current?.emit("cursor-move", state.pending);
        state.pending = null;
      }
      state.timer = null;
    }, 50);
  }, []);

  // ─── Multi-file emitters ──────────────────────────────────────

  const emitCreateFile = useCallback((filename: string, language: string, content?: string) => {
    socketRef.current?.emit("create-file", { filename, language, content });
  }, []);

  const emitDeleteFile = useCallback((filename: string) => {
    socketRef.current?.emit("delete-file", { filename });
  }, []);

  const emitRenameFile = useCallback((oldFilename: string, newFilename: string) => {
    socketRef.current?.emit("rename-file", { oldFilename, newFilename });
  }, []);

  const emitSwitchFile = useCallback((filename: string) => {
    socketRef.current?.emit("switch-file", { filename });
  }, []);

  return {
    emitCodeChange,
    emitLanguageChange,
    emitSave,
    emitMessage,
    emitCursorMove,
    emitCreateFile,
    emitDeleteFile,
    emitRenameFile,
    emitSwitchFile,
    socket: socketRef,
  };
}
