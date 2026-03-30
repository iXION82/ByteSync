"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import type * as Monaco from "monaco-editor";

interface CodeEditorProps {
  language: string;
  initialValue?: string;
  onChange: (value: string) => void;
  /** Called when the local cursor moves */
  onCursorChange?: (line: number, column: number) => void;
}

// Cursor colors for remote participants
const CURSOR_COLORS = [
  "#818cf8", // indigo
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f472b6", // pink
  "#a78bfa", // violet
  "#38bdf8", // sky
  "#fb923c", // orange
];

export interface CodeEditorHandle {
  setRemoteCode: (code: string) => void;
  setCode: (code: string) => void;
  getCode: () => string;
  /** Show/update a remote user's cursor */
  updateRemoteCursor: (userId: string, username: string, line: number, column: number, colorIndex: number) => void;
  /** Remove a remote user's cursor */
  removeRemoteCursor: (userId: string) => void;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor({ language, initialValue = "", onChange, onCursorChange }, ref) {
    const [theme, setTheme] = useState<"bytesync-dark" | "bytesync-light">("bytesync-dark");
    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof Monaco | null>(null);
    const isInternalEdit = useRef(false);

    // Track decoration IDs per remote user
    const cursorDecorationsRef = useRef<Map<string, string[]>>(new Map());
    // Track injected CSS style elements per user
    const cursorStylesRef = useRef<Map<string, HTMLStyleElement>>(new Map());
    // Throttle cursor updates per user (avoid jittery rapid-fire re-renders)
    const cursorThrottleRef = useRef<Map<string, { timer: ReturnType<typeof setTimeout> | null; pending: { line: number; column: number } | null }>>(new Map());

    /**
     * Compute minimal diff and apply only changed range
     */
    const applyMinimalEdit = useCallback(
      (newCode: string, source: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;

        const oldCode = model.getValue();
        if (oldCode === newCode) return;

        let start = 0;
        while (start < oldCode.length && start < newCode.length && oldCode[start] === newCode[start]) {
          start++;
        }

        let oldEnd = oldCode.length;
        let newEnd = newCode.length;
        while (oldEnd > start && newEnd > start && oldCode[oldEnd - 1] === newCode[newEnd - 1]) {
          oldEnd--;
          newEnd--;
        }

        const startPos = model.getPositionAt(start);
        const endPos = model.getPositionAt(oldEnd);
        const insertText = newCode.substring(start, newEnd);

        isInternalEdit.current = true;
        editor.executeEdits(source, [
          {
            range: {
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
            },
            text: insertText,
            forceMoveMarkers: true,
          },
        ]);
        isInternalEdit.current = false;
      },
      []
    );

    /**
     * Inject CSS for a cursor color (once per user)
     */
    const ensureCursorCSS = useCallback((userId: string, color: string) => {
      if (cursorStylesRef.current.has(userId)) return;

      const safeId = userId.replace(/[^a-zA-Z0-9]/g, "_");
      const style = document.createElement("style");
      style.textContent = `
        @keyframes remoteCursorPulse-${safeId} {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px ${color}60; }
          50% { opacity: 0.6; box-shadow: 0 0 8px ${color}40; }
        }
        @keyframes remoteCursorFadeIn-${safeId} {
          from { opacity: 0; transform: scaleY(0.3); }
          to { opacity: 1; transform: scaleY(1); }
        }
        @keyframes remoteLabelSlide-${safeId} {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .remote-cursor-${safeId} {
          border-left: 2px solid ${color};
          margin-left: -1px;
          position: relative;
          z-index: 10;
          animation: remoteCursorPulse-${safeId} 1.2s ease-in-out infinite,
                     remoteCursorFadeIn-${safeId} 0.15s ease-out;
          transform-origin: bottom;
        }
        .remote-cursor-label-${safeId} {
          position: relative;
        }
        .remote-cursor-label-${safeId}::after {
          content: attr(data-username);
          position: absolute;
          top: -18px;
          left: -1px;
          background: ${color};
          color: #000;
          font-size: 10px;
          font-weight: 700;
          font-family: 'IBM Plex Mono', monospace;
          padding: 1px 5px;
          border-radius: 3px 3px 3px 0;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
          line-height: 14px;
          animation: remoteLabelSlide-${safeId} 0.2s ease-out;
          box-shadow: 0 1px 4px ${color}30;
        }
        .remote-cursor-line-${safeId} {
          background: ${color}08;
          border-right: none;
          transition: opacity 0.2s ease;
          animation: remoteCursorFadeIn-${safeId} 0.2s ease-out;
        }
      `;
      document.head.appendChild(style);
      cursorStylesRef.current.set(userId, style);
    }, []);

    /**
     * Update or create a remote cursor decoration
     */
    /**
     * Internal: apply the decoration for a remote cursor at a given position
     */
    const applyRemoteCursor = useCallback(
      (userId: string, username: string, line: number, column: number, colorIndex: number) => {
        const editor = editorRef.current;
        if (!editor) return;

        const color = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length];
        const safeId = userId.replace(/[^a-zA-Z0-9]/g, "_");

        // Ensure CSS exists for this cursor color
        ensureCursorCSS(userId, color);

        // Build decorations
        const newDecorations: Monaco.editor.IModelDeltaDecoration[] = [
          {
            range: {
              startLineNumber: line,
              startColumn: column,
              endLineNumber: line,
              endColumn: column,
            },
            options: {
              className: `remote-cursor-${safeId}`,
              beforeContentClassName: `remote-cursor-label-${safeId}`,
              stickiness: 1, // NeverGrowsWhenTypingAtEdges
              hoverMessage: { value: username },
            },
          },
          {
            range: {
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: `remote-cursor-line-${safeId}`,
              stickiness: 1,
            },
          },
        ];

        // Replace previous decorations
        const oldIds = cursorDecorationsRef.current.get(userId) || [];
        const newIds = editor.deltaDecorations(oldIds, newDecorations);
        cursorDecorationsRef.current.set(userId, newIds);

        // Set the username data attribute on the label element (for ::after content)
        requestAnimationFrame(() => {
          const els = document.querySelectorAll(`.remote-cursor-label-${safeId}`);
          els.forEach((el) => el.setAttribute("data-username", username));
        });
      },
      [ensureCursorCSS]
    );

    /**
     * Throttled cursor update — coalesces rapid-fire cursor events into
     * smooth ~60ms intervals per user, preventing jittery decoration flicker.
     */
    const updateRemoteCursor = useCallback(
      (userId: string, username: string, line: number, column: number, colorIndex: number) => {
        let state = cursorThrottleRef.current.get(userId);
        if (!state) {
          state = { timer: null, pending: null };
          cursorThrottleRef.current.set(userId, state);
        }

        // Store the latest position
        state.pending = { line, column };

        // If a timer is already running, the pending update will be applied when it fires
        if (state.timer) return;

        // Apply immediately (first event in the batch)
        applyRemoteCursor(userId, username, line, column, colorIndex);
        state.pending = null;

        // Start throttle window
        state.timer = setTimeout(() => {
          // Apply the most recent pending position if any arrived during the window
          if (state!.pending) {
            applyRemoteCursor(userId, username, state!.pending.line, state!.pending.column, colorIndex);
            state!.pending = null;
          }
          state!.timer = null;
        }, 60);
      },
      [applyRemoteCursor]
    );

    /**
     * Remove a remote cursor
     */
    const removeRemoteCursor = useCallback((userId: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const oldIds = cursorDecorationsRef.current.get(userId) || [];
      editor.deltaDecorations(oldIds, []);
      cursorDecorationsRef.current.delete(userId);

      // Remove injected CSS
      const style = cursorStylesRef.current.get(userId);
      if (style) {
        style.remove();
        cursorStylesRef.current.delete(userId);
      }
    }, []);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      setRemoteCode: (code: string) => applyMinimalEdit(code, "remote-sync"),
      setCode: (code: string) => applyMinimalEdit(code, "programmatic"),
      getCode: () => editorRef.current?.getModel()?.getValue() || "",
      updateRemoteCursor,
      removeRemoteCursor,
    }), [applyMinimalEdit, updateRemoteCursor, removeRemoteCursor]);

    useEffect(() => {
      const updateTheme = () => {
        const current = document.documentElement.getAttribute("data-theme");
        setTheme(current === "light" ? "bytesync-light" : "bytesync-dark");
      };
      updateTheme();

      const observer = new MutationObserver(updateTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      return () => observer.disconnect();
    }, []);

    const handleEditorMount: OnMount = (editor, monaco) => {
      editorRef.current = editor;

      // Define custom dark theme
      monaco.editor.defineTheme("bytesync-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "", foreground: "00ff41", background: "050a05" },
          { token: "comment", foreground: "338a47", fontStyle: "italic" },
          { token: "keyword", foreground: "00ff41", fontStyle: "bold" },
          { token: "string", foreground: "69ff94" },
          { token: "number", foreground: "00e639" },
          { token: "type", foreground: "00cc33" },
          { token: "function", foreground: "4dff73" },
          { token: "variable", foreground: "00ff41" },
          { token: "operator", foreground: "00cc33" },
          { token: "delimiter", foreground: "338a47" },
        ],
        colors: {
          "editor.background": "#050a05",
          "editor.foreground": "#00ff41",
          "editor.lineHighlightBackground": "#0a150a",
          "editor.selectionBackground": "#00ff4125",
          "editor.inactiveSelectionBackground": "#00ff4115",
          "editorCursor.foreground": "#00ff41",
          "editorLineNumber.foreground": "#1a4d26",
          "editorLineNumber.activeForeground": "#00cc33",
          "editor.selectionHighlightBackground": "#00ff4115",
          "editorWidget.background": "#0a120a",
          "editorWidget.border": "#1a4d26",
          "editorSuggestWidget.background": "#0a120a",
          "editorSuggestWidget.border": "#1a4d26",
          "editorSuggestWidget.foreground": "#00ff41",
          "editorSuggestWidget.selectedBackground": "#00ff4120",
          "editorHoverWidget.background": "#0a120a",
          "editorHoverWidget.border": "#1a4d26",
          "input.background": "#0a120a",
          "input.foreground": "#00ff41",
          "input.border": "#1a4d26",
          "scrollbar.shadow": "#000000",
          "scrollbarSlider.background": "#00ff4120",
          "scrollbarSlider.hoverBackground": "#00ff4140",
          "scrollbarSlider.activeBackground": "#00ff4160",
          // Prevent green flash on programmatic edits
          "editor.rangeHighlightBackground": "#00000000",
          "editor.wordHighlightBackground": "#00000000",
          "editor.wordHighlightStrongBackground": "#00000000",
          "editor.wordHighlightTextBackground": "#00000000",
          "editor.findMatchHighlightBackground": "#00000000",
          "diffEditor.insertedTextBackground": "#00000000",
          "diffEditor.removedTextBackground": "#00000000",
          "diffEditor.insertedLineBackground": "#00000000",
          "diffEditor.removedLineBackground": "#00000000",
        },
      });

      // Define custom light theme
      monaco.editor.defineTheme("bytesync-light", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "", foreground: "1a2e1a", background: "f0ead6" },
          { token: "comment", foreground: "5c7a5c", fontStyle: "italic" },
          { token: "keyword", foreground: "1a6b2a", fontStyle: "bold" },
          { token: "string", foreground: "2d6b1a" },
          { token: "number", foreground: "1a6b2a" },
          { token: "type", foreground: "2d4a2d" },
          { token: "function", foreground: "1a5c2a" },
          { token: "variable", foreground: "1a2e1a" },
          { token: "operator", foreground: "2d4a2d" },
          { token: "delimiter", foreground: "5c7a5c" },
        ],
        colors: {
          "editor.background": "#f0ead6",
          "editor.foreground": "#1a2e1a",
          "editor.lineHighlightBackground": "#e6dfc8",
          "editor.selectionBackground": "#1a6b2a25",
          "editorCursor.foreground": "#1a6b2a",
          "editorLineNumber.foreground": "#8a9f8a",
          "editorLineNumber.activeForeground": "#2d4a2d",
          "editorWidget.background": "#e6dfc8",
          "editorWidget.border": "#c5bfa8",
          "scrollbarSlider.background": "#1a6b2a20",
          "scrollbarSlider.hoverBackground": "#1a6b2a40",
        },
      });

      const current = document.documentElement.getAttribute("data-theme");
      monaco.editor.setTheme(current === "light" ? "bytesync-light" : "bytesync-dark");

      editor.focus();

      // Listen for cursor position changes
      editor.onDidChangeCursorPosition((e) => {
        // Only emit if it's a real user action, not an internal programmatic edit
        if (!isInternalEdit.current && onCursorChange) {
          onCursorChange(e.position.lineNumber, e.position.column);
        }
      });
    };

    const handleChange = useCallback(
      (val: string | undefined) => {
        if (isInternalEdit.current) return;
        onChange(val || "");
      },
      [onChange]
    );

    return (
      <div className="h-full w-full">
        <Editor
          height="100%"
          language={language}
          defaultValue={initialValue}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={theme}
          options={{
            fontSize: 14,
            fontFamily: "'IBM Plex Mono', 'Fira Code', 'Courier New', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            lineNumbers: "on",
            renderLineHighlight: "line",
            cursorBlinking: "phase",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            wordWrap: "on",
            tabSize: 2,
          }}
          loading={
            <div className="flex items-center justify-center gap-2 h-full bg-[var(--bg-primary)] font-sans text-[0.9rem] text-[var(--text-muted)]">
              <span className="text-[var(--accent)]">&gt; Loading editor...</span>
              <span className="text-[var(--accent)]" style={{ animation: "blink 1s step-end infinite" }}>█</span>
            </div>
          }
        />
      </div>
    );
  }
);

export default CodeEditor;
