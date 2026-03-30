import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

interface UseSocketOptions {
  roomId: string;
  clerkId: string;
  onRoomState?: (data: { code: string; codeLanguage: string; users: SocketUser[] }) => void;
  onCodeUpdate?: (data: { code: string; codeLanguage?: string; userId: string }) => void;
  onLanguageUpdate?: (data: { codeLanguage: string; code: string; userId: string }) => void;
  onUserJoined?: (data: { userId: string; username: string; users: SocketUser[] }) => void;
  onUserLeft?: (data: { userId: string; users: SocketUser[] }) => void;
  onCodeSaved?: (data: { timestamp: string }) => void;
  onCursorUpdate?: (data: { userId: string; line: number; column: number }) => void;
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
  onCursorUpdate,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const callbacksRef = useRef({
    onRoomState, onCodeUpdate, onLanguageUpdate,
    onUserJoined, onUserLeft, onCodeSaved, onCursorUpdate,
  });
  callbacksRef.current = {
    onRoomState, onCodeUpdate, onLanguageUpdate,
    onUserJoined, onUserLeft, onCodeSaved, onCursorUpdate,
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

    socket.on("room-state", (data) => callbacksRef.current.onRoomState?.(data));
    socket.on("code-update", (data) => callbacksRef.current.onCodeUpdate?.(data));
    socket.on("language-update", (data) => callbacksRef.current.onLanguageUpdate?.(data));
    socket.on("user-joined", (data) => callbacksRef.current.onUserJoined?.(data));
    socket.on("user-left", (data) => callbacksRef.current.onUserLeft?.(data));
    socket.on("code-saved", (data) => callbacksRef.current.onCodeSaved?.(data));
    socket.on("cursor-update", (data) => callbacksRef.current.onCursorUpdate?.(data));

    socket.on("error", (data) => console.error("Socket error:", data.message));
    socket.on("disconnect", () => console.log("🔌 Socket disconnected"));

    return () => {
      socket.emit("leave-room");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, clerkId]);

  const emitCodeChange = useCallback((code: string, codeLanguage?: string) => {
    socketRef.current?.emit("code-change", { code, codeLanguage });
  }, []);

  const emitLanguageChange = useCallback((codeLanguage: string, code: string) => {
    socketRef.current?.emit("language-change", { codeLanguage, code });
  }, []);

  const emitSave = useCallback(() => {
    socketRef.current?.emit("save-code");
  }, []);

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
