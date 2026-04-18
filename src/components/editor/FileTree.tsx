"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { inferLanguageFromFilename } from "@/lib/editorConstants";


export interface FileItem {
  filename: string;
  content: string;
  language: string;
}

interface FileTreeProps {
  files: FileItem[];
  activeFile: string;
  isOwner: boolean;
  onSwitchFile: (filename: string) => void;
  onCreateFile: (filename: string, language: string) => void;
  onDeleteFile: (filename: string) => void;
  onRenameFile: (oldFilename: string, newFilename: string) => void;
}


const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  js: { icon: "JS", color: "#f7df1e" },
  mjs: { icon: "JS", color: "#f7df1e" },
  ts: { icon: "TS", color: "#3178c6" },
  tsx: { icon: "TX", color: "#3178c6" },
  py: { icon: "PY", color: "#3776ab" },
  java: { icon: "JV", color: "#ed8b00" },
  cpp: { icon: "C+", color: "#00599c" },
  c: { icon: "C", color: "#a8b9cc" },
  h: { icon: "H", color: "#a8b9cc" },
  go: { icon: "GO", color: "#00add8" },
  rs: { icon: "RS", color: "#dea584" },
  html: { icon: "HT", color: "#e34c26" },
  css: { icon: "CS", color: "#264de4" },
  json: { icon: "{}", color: "#9b9b9b" },
  md: { icon: "MD", color: "#ffffff" },
  txt: { icon: "TX", color: "#9b9b9b" },
};

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || { icon: "•", color: "var(--text-muted)" };
}


export default function FileTree({
  files,
  activeFile,
  isOwner,
  onSwitchFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}: FileTreeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) newFileInputRef.current?.focus();
  }, [isCreating]);

  useEffect(() => {
    if (renamingFile) renameInputRef.current?.focus();
  }, [renamingFile]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const handleCreateSubmit = useCallback(() => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }

    const hasExt = trimmed.includes(".");
    const finalName = hasExt ? trimmed : `${trimmed}.js`;

    if (files.some((f) => f.filename === finalName)) {
      setNewFileName("");
      return;
    }

    const language = inferLanguageFromFilename(finalName);
    onCreateFile(finalName, language);
    setNewFileName("");
    setIsCreating(false);
  }, [newFileName, files, onCreateFile]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (!trimmed || !renamingFile || trimmed === renamingFile) {
      setRenamingFile(null);
      return;
    }

    if (files.some((f) => f.filename === trimmed)) {
      setRenamingFile(null);
      return;
    }

    onRenameFile(renamingFile, trimmed);
    setRenamingFile(null);
  }, [renameValue, renamingFile, files, onRenameFile]);

  const handleDeleteClick = useCallback(
    (filename: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete === filename) {
        onDeleteFile(filename);
        setConfirmDelete(null);
      } else {
        setConfirmDelete(filename);
      }
    },
    [confirmDelete, onDeleteFile]
  );

  const startRename = useCallback((filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingFile(filename);
    setRenameValue(filename);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        width: "100%",
        overflow: "hidden",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0.65rem",
          borderBottom: "1px solid var(--border-color)",
          minHeight: "2rem",
        }}
      >
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: "0.35rem", verticalAlign: "-1px" }}
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          FILES
        </span>
        {isOwner && (
          <button
            onClick={() => {
              setIsCreating(true);
              setNewFileName("");
            }}
            title="New file"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "3px",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s",
              fontSize: "0.75rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.background = "var(--bg-card)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "none";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0.25rem 0",
        }}
      >
        {files.map((file) => {
          const isActive = file.filename === activeFile;
          const icon = getFileIcon(file.filename);
          const isDeleting = confirmDelete === file.filename;
          const isRenaming = renamingFile === file.filename;

          return (
            <div
              key={file.filename}
              onClick={() => !isRenaming && onSwitchFile(file.filename)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.65rem",
                cursor: isRenaming ? "default" : "pointer",
                fontSize: "0.75rem",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                backgroundColor: isActive
                  ? "rgba(0, 255, 65, 0.06)"
                  : "transparent",
                borderLeft: isActive
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                transition: "all 0.15s ease",
                position: "relative",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--bg-card)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
                const actions = e.currentTarget.querySelector(
                  "[data-actions]"
                ) as HTMLElement;
                if (actions) actions.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }
                const actions = e.currentTarget.querySelector(
                  "[data-actions]"
                ) as HTMLElement;
                if (actions && !isDeleting) actions.style.opacity = "0";
              }}
            >
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  color: icon.color,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  padding: "1px 3px",
                  borderRadius: "2px",
                  minWidth: "18px",
                  textAlign: "center",
                  lineHeight: "1.3",
                  flexShrink: 0,
                }}
              >
                {icon.icon}
              </span>

              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
                    if (e.key === "Escape") setRenamingFile(null);
                  }}
                  onBlur={handleRenameSubmit}
                  style={{
                    flex: 1,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--accent)",
                    color: "var(--text-primary)",
                    fontSize: "0.72rem",
                    fontFamily: "inherit",
                    padding: "1px 4px",
                    borderRadius: "3px",
                    outline: "none",
                    minWidth: 0,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {file.filename}
                </span>
              )}

              {isOwner && !isRenaming && (
                <div
                  data-actions
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    opacity: isDeleting ? 1 : 0,
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={(e) => startRename(file.filename, e)}
                    title="Rename"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "1px 3px",
                      borderRadius: "2px",
                      display: "flex",
                      alignItems: "center",
                      fontSize: "0.65rem",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-muted)")
                    }
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>

                  {files.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteClick(file.filename, e)}
                      title={isDeleting ? "Click again to confirm" : "Delete"}
                      style={{
                        background: "none",
                        border: "none",
                        color: isDeleting ? "#ef4444" : "var(--text-muted)",
                        cursor: "pointer",
                        padding: "1px 3px",
                        borderRadius: "2px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.65rem",
                        animation: isDeleting
                          ? "badge-pulse 1s infinite"
                          : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isDeleting)
                          e.currentTarget.style.color = "#ef4444";
                      }}
                      onMouseLeave={(e) => {
                        if (!isDeleting)
                          e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isCreating && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.65rem",
            }}
          >
            <span
              style={{
                fontSize: "0.55rem",
                fontWeight: 700,
                color: "var(--accent)",
                backgroundColor: "rgba(0, 255, 65, 0.1)",
                padding: "1px 3px",
                borderRadius: "2px",
                minWidth: "18px",
                textAlign: "center",
                lineHeight: "1.3",
              }}
            >
              +
            </span>
            <input
              ref={newFileInputRef}
              type="text"
              placeholder="filename.ext"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSubmit();
                if (e.key === "Escape") setIsCreating(false);
              }}
              onBlur={() => {
                if (!newFileName.trim()) setIsCreating(false);
                else handleCreateSubmit();
              }}
              style={{
                flex: 1,
                background: "var(--bg-primary)",
                border: "1px solid var(--accent)",
                color: "var(--text-primary)",
                fontSize: "0.72rem",
                fontFamily: "inherit",
                padding: "2px 6px",
                borderRadius: "3px",
                outline: "none",
                minWidth: 0,
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          padding: "0.35rem 0.65rem",
          borderTop: "1px solid var(--border-color)",
          fontSize: "0.6rem",
          color: "var(--text-muted)",
          opacity: 0.6,
        }}
      >
        {files.length} file{files.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
