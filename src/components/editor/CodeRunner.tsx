"use client";

import { useState, useRef, useEffect } from "react";

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const isComplete = useRef(false);

  useEffect(() => {
    setDisplayed("");
    isComplete.current = false;
    
    // Fast path: if text is over 500 chars, skip animation to avoid long waits
    if (text.length > 500) {
      setDisplayed(text);
      isComplete.current = true;
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        isComplete.current = true;
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text]);

  const handleSkip = () => {
    if (!isComplete.current) {
      setDisplayed(text);
      isComplete.current = true;
    }
  };

  return (
    <pre onClick={handleSkip} className="whitespace-pre-wrap break-words m-0 font-inherit text-[var(--text-primary)] cursor-pointer" title="Click to skip animation">
      {displayed}
      {!isComplete.current && <span className="opacity-70 text-[var(--accent)]" style={{ animation: "blink 1s step-end infinite" }}>█</span>}
    </pre>
  );
}

interface CodeRunnerProps {
  output: string;
  isRunning: boolean;
  error: string;
  executionTime: number | null;
}

export default function CodeRunner({ output, isRunning, error, executionTime }: CodeRunnerProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between px-4 py-[0.6rem] bg-[var(--bg-secondary)] border-b border-[var(--border-color)] min-h-[40px]">
        <div className="flex items-center gap-[0.4rem] text-[var(--accent)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span className="font-mono text-[1.1rem] tracking-[0.05em]">OUTPUT</span>
        </div>
        {executionTime !== null && (
          <span className="font-sans text-[0.7rem] text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-[0.15rem] rounded-[4px] border border-[var(--border-color)]">
            {executionTime}ms
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-sans text-[0.85rem] leading-[1.6] text-[var(--text-primary)]">
        {isRunning ? (
          <div className="flex items-center gap-[0.4rem] text-[var(--accent)]">
            <span style={{ animation: "pulse-glow 1.5s infinite" }}>&gt; Executing program...</span>
            <span className="text-[var(--accent)]" style={{ animation: "blink 1s step-end infinite" }}>█</span>
          </div>
        ) : error ? (
          <div>
            <span className="text-[var(--accent)] font-bold mr-2">ERR&gt;</span>
            <pre className="whitespace-pre-wrap break-words m-0 font-inherit text-[#ff6b6b] inline">{error}</pre>
          </div>
        ) : output ? (
          <div>
            <TypewriterText text={output} />
          </div>
        ) : (
          <div className="flex items-center gap-[0.4rem] text-[var(--text-muted)]">
            <span className="text-[var(--accent)] font-bold mr-2">$</span>
            <span>Run your code to see output here</span>
            <span className="text-[var(--accent)]" style={{ animation: "blink 1s step-end infinite" }}>█</span>
          </div>
        )}
      </div>
    </div>
  );
}
