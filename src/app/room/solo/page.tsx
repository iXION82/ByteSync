"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import CodeRunner from "@/components/editor/CodeRunner";
import { LANGUAGES, DEFAULT_LANGUAGE_ID, getLanguageById } from "@/lib/editorConstants";
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
  const soloEditorRef = useRef<CodeEditorHandle | null>(null);

  const handleLanguageChange = useCallback((newLangId: string) => {
    setLanguageId(newLangId);
    const lang = getLanguageById(newLangId);
    if (lang) {
      setCode(lang.starterCode);
      soloEditorRef.current?.setCode(lang.starterCode);
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

  return (
    <div className="flex flex-col h-screen pt-16 bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-0 h-auto sm:h-13 min-h-13 bg-(--bg-secondary) border-b border-(--border-color) gap-2 sm:gap-4 z-10 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-[0.4rem] font-mono text-base sm:text-[1.2rem] text-(--accent) whitespace-nowrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>SOLO_ROOM</span>
          </div>

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
            className="flex items-center gap-[0.35rem] font-mono text-[1.05rem] font-normal py-[0.3rem] px-[0.9rem] rounded-md cursor-pointer transition-all duration-200 border border-(--border-color) whitespace-nowrap tracking-[0.02em] disabled:opacity-50 disabled:cursor-not-allowed bg-transparent text-(--text-muted) hover:text-[var.(--text-primary)] hover:border-(--border-hover) hover:bg-(--bg-card)"
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

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="h-[55%] md:h-auto md:flex-1 min-w-0 overflow-hidden border-b md:border-b-0 md:border-r border-(--border-color)">
          <CodeEditor
            ref={soloEditorRef}
            language={currentLang.monacoLang}
            initialValue={code}
            onChange={setCode}
          />
        </div>
        <div className="h-[45%] md:h-auto w-full md:w-[40%] min-w-0 md:min-w-70 max-w-none md:max-w-150 overflow-hidden flex flex-col">
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
