import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

interface UseSocketOptions {
  roomId: string;
  /** The Clerk user ID */
  clerkId: string;
  /** Called when room state is received (initial join) */
  onRoomState?: (data: { code: string; codeLanguage: string; users: SocketUser[] }) => void;
  /** Called when another user changes the code */
  onCodeUpdate?: (data: { code: string; codeLanguage?: string; userId: string }) => void;
  /** Called when another user changes the language */
  onLanguageUpdate?: (data: { codeLanguage: string; code: string; userId: string }) => void;
  /** Called when a user joins */
  onUserJoined?: (data: { userId: string; username: string; users: SocketUser[] }) => void;
  /** Called when a user leaves */
  onUserLeft?: (data: { userId: string; users: SocketUser[] }) => void;
  /** Called after a manual save */
  onCodeSaved?: (data: { timestamp: string }) => void;
}

export interface SocketUser {
  socketId: string;
  username: string;
  userId: string;
}

export function useSocket({
  roomId,
  clerkId,
  onRoomState,
  onCodeUpdate,
  onLanguageUpdate,
  onUserJoined,
  onUserLeft,
  onCodeSaved,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  // Use refs for callbacks to avoid re-connecting on every render
  const callbacksRef = useRef({
    onRoomState,
    onCodeUpdate,
    onLanguageUpdate,
    onUserJoined,
    onUserLeft,
    onCodeSaved,
  });
  callbacksRef.current = {
    onRoomState,
    onCodeUpdate,
    onLanguageUpdate,
    onUserJoined,
    onUserLeft,
    onCodeSaved,
  };

  // Connect and join room
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

    socket.on("room-state", (data) => {
      callbacksRef.current.onRoomState?.(data);
    });

    socket.on("code-update", (data) => {
      callbacksRef.current.onCodeUpdate?.(data);
    });

    socket.on("language-update", (data) => {
      callbacksRef.current.onLanguageUpdate?.(data);
    });

    socket.on("user-joined", (data) => {
      callbacksRef.current.onUserJoined?.(data);
    });

    socket.on("user-left", (data) => {
      callbacksRef.current.onUserLeft?.(data);
    });

    socket.on("code-saved", (data) => {
      callbacksRef.current.onCodeSaved?.(data);
    });

    socket.on("error", (data) => {
      console.error("Socket error:", data.message);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    return () => {
      socket.emit("leave-room");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, clerkId]);

  // Emit code change (call this when user types)
  const emitCodeChange = useCallback((code: string, codeLanguage?: string) => {
    socketRef.current?.emit("code-change", { code, codeLanguage });
  }, []);

  // Emit language change
  const emitLanguageChange = useCallback((codeLanguage: string, code: string) => {
    socketRef.current?.emit("language-change", { codeLanguage, code });
  }, []);

  // Request manual save
  const emitSave = useCallback(() => {
    socketRef.current?.emit("save-code");
  }, []);

  // Emit cursor position
  const emitCursorMove = useCallback((line: number, column: number) => {
    socketRef.current?.emit("cursor-move", { line, column });
  }, []);

  return {
    emitCodeChange,
    emitLanguageChange,
    emitSave,
    emitCursorMove,
    socket: socketRef,
  };
}
