"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import CodeRunner from "@/components/editor/CodeRunner";
import { LANGUAGES, DEFAULT_LANGUAGE_ID, getLanguageById } from "@/lib/editorConstants";

// Dynamic import Monaco to avoid SSR issues
const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <span className="editor-loading-text">&gt; Loading editor...</span>
      <span className="editor-loading-cursor">█</span>
    </div>
  ),
});

const EXECUTE_API = "/api/execute";

export default function SoloRoomPage() {
  const [languageId, setLanguageId] = useState(DEFAULT_LANGUAGE_ID);
  const [code, setCode] = useState(
    getLanguageById(DEFAULT_LANGUAGE_ID)?.starterCode || ""
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const currentLang = getLanguageById(languageId)!;

  const handleLanguageChange = useCallback((newLangId: string) => {
    setLanguageId(newLangId);
    const lang = getLanguageById(newLangId);
    if (lang) {
      setCode(lang.starterCode);
    }
    // Clear previous output
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

  return (
    <div className="solo-room">
      {/* Toolbar */}
      <div className="solo-toolbar">
        <div className="solo-toolbar-left">
          <div className="solo-toolbar-brand">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>SOLO_ROOM</span>
          </div>

          {/* Language Selector */}
          <div className="solo-select-wrapper">
            <label className="solo-select-label" htmlFor="lang-select">LANG:</label>
            <select
              id="lang-select"
              className="solo-select"
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

        <div className="solo-toolbar-right">
          <button
            className="solo-btn solo-btn-clear"
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
            className="solo-btn solo-btn-run"
            onClick={handleRunCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <span className="solo-spinner" />
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

      {/* Main Content: Editor + Output */}
      <div className="solo-content">
        <div className="solo-editor-pane">
          <CodeEditor
            language={currentLang.monacoLang}
            value={code}
            onChange={setCode}
          />
        </div>
        <div className="solo-output-pane">
          <CodeRunner
            output={output}
            isRunning={isRunning}
            error={error}
            executionTime={executionTime}
          />
        </div>
      </div>
    </div>
  );
}
