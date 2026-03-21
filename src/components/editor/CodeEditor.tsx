"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useState } from "react";

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const [theme, setTheme] = useState<"bytesync-dark" | "bytesync-light">("bytesync-dark");

  useEffect(() => {
    // Sync with document theme
    const updateTheme = () => {
      const current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "light" ? "bytesync-light" : "bytesync-dark");
    };
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Define custom dark theme — CRT green phosphor
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
      },
    });

    // Define custom light theme — vintage beige
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

    // Set initial theme
    const current = document.documentElement.getAttribute("data-theme");
    monaco.editor.setTheme(current === "light" ? "bytesync-light" : "bytesync-dark");

    // Focus the editor
    editor.focus();
  };

  return (
    <div className="code-editor-wrapper">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val || "")}
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
          <div className="editor-loading">
            <span className="editor-loading-text">&gt; Loading editor...</span>
            <span className="editor-loading-cursor">█</span>
          </div>
        }
      />
    </div>
  );
}
