"use client";

interface CodeRunnerProps {
  output: string;
  isRunning: boolean;
  error: string;
  executionTime: number | null;
}

export default function CodeRunner({ output, isRunning, error, executionTime }: CodeRunnerProps) {
  return (
    <div className="code-runner-wrapper">
      <div className="runner-header">
        <div className="runner-header-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span className="runner-title">OUTPUT</span>
        </div>
        {executionTime !== null && (
          <span className="runner-time">
            {executionTime}ms
          </span>
        )}
      </div>

      <div className="runner-body">
        {isRunning ? (
          <div className="runner-running">
            <span className="runner-running-text">&gt; Executing program...</span>
            <span className="runner-cursor">█</span>
          </div>
        ) : error ? (
          <div className="runner-output runner-error">
            <span className="runner-prompt">ERR&gt;</span>
            <pre>{error}</pre>
          </div>
        ) : output ? (
          <div className="runner-output">
            <pre>{output}</pre>
          </div>
        ) : (
          <div className="runner-placeholder">
            <span className="runner-prompt">$</span>
            <span>Run your code to see output here</span>
            <span className="runner-cursor">█</span>
          </div>
        )}
      </div>
    </div>
  );
}
