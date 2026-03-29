"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useState, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import type * as Monaco from "monaco-editor";

interface CodeEditorProps {
  language: string;
  initialValue?: string;
  onChange: (value: string) => void;
}

export interface CodeEditorHandle {
  /** Push code from a remote user without triggering the green diff flash */
  setRemoteCode: (code: string) => void;
  /** Set code programmatically (e.g. language switch) — also no flash */
  setCode: (code: string) => void;
  /** Get the current code */
  getCode: () => string;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor({ language, initialValue = "", onChange }, ref) {
    const [theme, setTheme] = useState<"bytesync-dark" | "bytesync-light">("bytesync-dark");
    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const isInternalEdit = useRef(false);

    /**
     * Compute the minimal edit between oldText and newText,
     * then apply only the changed range via executeEdits.
     * This avoids re-tokenizing the entire document (no green flash).
     */
    const applyMinimalEdit = useCallback(
      (newCode: string, source: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;

        const oldCode = model.getValue();
        if (oldCode === newCode) return;

        // Find the first character that differs
        let start = 0;
        while (start < oldCode.length && start < newCode.length && oldCode[start] === newCode[start]) {
          start++;
        }

        // Find the last character that differs (from the end)
        let oldEnd = oldCode.length;
        let newEnd = newCode.length;
        while (oldEnd > start && newEnd > start && oldCode[oldEnd - 1] === newCode[newEnd - 1]) {
          oldEnd--;
          newEnd--;
        }

        // Convert character offsets to Monaco positions
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

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      setRemoteCode: (code: string) => applyMinimalEdit(code, "remote-sync"),
      setCode: (code: string) => applyMinimalEdit(code, "programmatic"),
      getCode: () => editorRef.current?.getModel()?.getValue() || "",
    }), [applyMinimalEdit]);

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
