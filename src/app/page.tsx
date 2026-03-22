"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative transition-colors duration-300">
      {/* Scanline overlay — complex gradient moved to style prop */}
      <div
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] opacity-60"
        style={{
          background:
            "repeating-linear-gradient(0deg, var(--scanline-color) 0px, var(--scanline-color) 1px, transparent 1px, transparent 3px)",
        }}
        aria-hidden="true"
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-16 px-6 overflow-hidden">
        {/* Ambient glow orbs */}
        <div
          className="absolute rounded-full pointer-events-none w-[500px] h-[500px] top-[5%] left-[10%] blur-[120px]"
          style={{
            background: "var(--accent-secondary-glow)",
            animation: "pulse-glow 6s infinite ease-in-out",
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none w-[400px] h-[400px] bottom-[10%] right-[5%] blur-[120px]"
          style={{
            background: "var(--accent-tertiary-glow)",
            animation: "pulse-glow 6s infinite ease-in-out",
            animationDelay: "-3s",
          }}
        />

        <div className="relative w-full max-w-[800px] mx-auto text-center z-[1]">
          {/* Retro badge */}
          <div className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)] px-[1.2rem] py-[0.4rem] rounded-[100px] font-sans text-[0.75rem] font-semibold tracking-[0.1em] uppercase mb-8">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "var(--accent)",
                animation: "badge-pulse 2s infinite",
              }}
            />
            SYSTEM ONLINE — v1.0
          </div>

          {/* Main title */}
          <h1
            className="font-mono font-normal leading-none text-[var(--accent)] mb-5 tracking-[0.02em]"
            style={{
              fontSize: "clamp(3.5rem, 10vw, 7rem)",
              animation: "text-glow 3s infinite ease-in-out, flicker 8s infinite",
            }}
          >
            {">"} ByteSync_
          </h1>

          <p
            className="font-mono text-[var(--text-secondary)] tracking-[0.08em] uppercase mb-6"
            style={{ fontSize: "clamp(1.3rem, 3vw, 1.8rem)" }}
          >
            Real-Time Collaborative Code Editor
          </p>

          <motion.p
            className="font-sans text-base leading-[1.7] text-[var(--text-muted)] max-w-[520px] mx-auto mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Create rooms, invite teammates, and code together in perfect sync.
            Built for developers who ship fast.
          </motion.p>

          {/* Auth-aware buttons */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {isLoaded && isSignedIn ? (
              <>
                <Link
                  href="/room/create"
                  id="create-room-btn"
                  className="inline-flex items-center gap-2 font-mono font-normal no-underline px-[1.8rem] py-[0.7rem] rounded-md transition-all duration-300 tracking-[0.02em] text-[var(--btn-primary-text)] hover:-translate-y-[2px]"
                  style={{
                    fontSize: "1.3rem",
                    background: "var(--btn-primary-bg)",
                    boxShadow: "0 0 20px var(--accent-glow), 0 0 60px var(--accent-glow)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Room
                </Link>
                <Link
                  href="/room/join"
                  id="join-room-btn"
                  className="inline-flex items-center gap-2 font-mono font-normal no-underline px-[1.8rem] py-[0.7rem] rounded-md border transition-all duration-300 tracking-[0.02em] text-[var(--btn-secondary-text)] border-[var(--btn-secondary-border)] hover:bg-[var(--bg-card)] hover:border-[var(--accent)] hover:-translate-y-[2px]"
                  style={{ fontSize: "1.3rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Join Room
                </Link>
                <Link
                  href="/room/solo"
                  id="solo-room-btn"
                  className="inline-flex items-center gap-2 font-mono font-normal no-underline px-[1.8rem] py-[0.7rem] rounded-md border transition-all duration-300 tracking-[0.02em] text-[var(--btn-tertiary-text)] border-[var(--border-color)] hover:border-[var(--accent-dim)] hover:bg-[var(--bg-card-hover)] hover:-translate-y-[2px]"
                  style={{ fontSize: "1.3rem", background: "var(--btn-tertiary-bg)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Solo Room
                </Link>
              </>
            ) : isLoaded ? (
              <>
                <Link
                  href="/sign-up"
                  id="get-started-btn"
                  className="inline-flex items-center gap-2 font-mono font-normal no-underline px-[1.8rem] py-[0.7rem] rounded-md transition-all duration-300 tracking-[0.02em] text-[var(--btn-primary-text)] hover:-translate-y-[2px]"
                  style={{
                    fontSize: "1.3rem",
                    background: "var(--btn-primary-bg)",
                    boxShadow: "0 0 20px var(--accent-glow), 0 0 60px var(--accent-glow)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                  </svg>
                  Get Started
                </Link>
                <Link
                  href="/sign-in"
                  id="sign-in-btn"
                  className="inline-flex items-center gap-2 font-mono font-normal no-underline px-[1.8rem] py-[0.7rem] rounded-md border transition-all duration-300 tracking-[0.02em] text-[var(--btn-secondary-text)] border-[var(--btn-secondary-border)] hover:bg-[var(--bg-card)] hover:border-[var(--accent)] hover:-translate-y-[2px]"
                  style={{ fontSize: "1.3rem" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Sign In
                </Link>
              </>
            ) : (
              <div className="w-[200px] h-[50px] rounded-md bg-[var(--bg-card)] border border-[var(--border-color)]" />
            )}
          </motion.div>
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="px-6 pb-20 max-w-[700px] mx-auto">
        <motion.div
          className="bg-[var(--terminal-bg)] border border-[var(--terminal-border)] rounded-[12px] overflow-hidden"
          style={{ boxShadow: "0 0 40px rgba(0,212,255,0.08), 0 8px 32px rgba(0,0,0,0.5)" }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--terminal-border)] bg-[var(--bg-card)]">
            <div className="flex gap-[6px]">
              <span className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
              <span className="w-[10px] h-[10px] rounded-full bg-[#ffbd2e]" />
              <span className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
            </div>
            <span className="font-sans text-[0.75rem] text-[var(--text-muted)] tracking-[0.03em]">bytesync — session_01</span>
          </div>
          <div className="flex flex-col gap-2 p-5">
            <div className="flex items-center gap-2 font-sans text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
              <span className="text-[var(--accent)] font-bold">$</span>
              <span className="text-[var(--text-primary)]">bytesync connect --room dev-team</span>
            </div>
            <div className="font-sans text-[0.85rem] leading-[1.6] text-[var(--text-muted)] pl-4">
              ✓ Connected to room &quot;dev-team&quot; (3 users online)
            </div>
            <div className="font-sans text-[0.85rem] leading-[1.6] text-[var(--text-muted)] pl-4">
              ✓ Syntax highlighting: TypeScript
            </div>
            <div className="font-sans text-[0.85rem] leading-[1.6] text-[var(--text-muted)] pl-4">
              ✓ Auto-save: enabled
            </div>
            <div className="flex items-center gap-2 font-sans text-[0.85rem] leading-[1.6] text-[var(--text-secondary)]">
              <span className="text-[var(--accent)] font-bold">$</span>
              <span className="text-[var(--text-primary)]">Ready to code</span>
              <span
                className="text-[var(--accent)] text-[0.9rem]"
                style={{ animation: "blink 1s step-end infinite" }}
              >█</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-8 pb-24 max-w-[1000px] mx-auto">
        <motion.h2
          className="font-mono text-[1.6rem] text-[var(--text-muted)] text-center mb-12 tracking-[0.05em]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {"// SYSTEM CAPABILITIES"}
        </motion.h2>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {[
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              ),
              title: "Real-Time Sync",
              desc: "Every keystroke synced instantly. See your teammates type in real-time with zero latency editing.",
              accentVar: "var(--accent)",
              accentGlow: "var(--accent-glow)",
              borderHover: "var(--border-hover)",
              bgHover: "var(--bg-card-hover)",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              ),
              title: "Multi-Language",
              desc: "Syntax highlighting for 50+ languages. From Python to Rust, we've got your stack covered.",
              accentVar: "var(--accent-secondary)",
              accentGlow: "var(--accent-secondary-glow)",
              borderHover: "rgba(255,107,255,0.28)",
              bgHover: "rgba(255,107,255,0.08)",
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "Secure Rooms",
              desc: "Private rooms with access controls. Your code stays between you and your team.",
              accentVar: "var(--accent-tertiary)",
              accentGlow: "var(--accent-tertiary-glow)",
              borderHover: "rgba(255,184,0,0.28)",
              bgHover: "rgba(255,184,0,0.08)",
            },
          ].map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} delay={i * 0.12} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-10 px-6 transition-colors duration-300">
        <div className="max-w-[1000px] mx-auto flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[1.3rem] text-[var(--accent)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
              <line x1="12" y1="2" x2="12" y2="22" opacity="0.4" />
            </svg>
            <span>ByteSync</span>
          </div>
          <p className="font-sans text-[0.8rem] text-[var(--text-muted)]">
            © {new Date().getFullYear()} ByteSync. Built for developers, by developers.
          </p>
          <div className="flex items-center gap-2 font-sans text-[0.8rem] text-[var(--text-secondary)]">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className="text-[var(--text-muted)] opacity-40">|</span>
            <a href="#" target="_blank" rel="noopener noreferrer">Docs</a>
            <span className="text-[var(--text-muted)] opacity-40">|</span>
            <a href="#" target="_blank" rel="noopener noreferrer">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Extracted to avoid inline style objects inside .map() callback
function FeatureCard({
  feature,
  delay,
}: {
  feature: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    accentVar: string;
    accentGlow: string;
    borderHover: string;
    bgHover: string;
  };
  delay: number;
}) {
  return (
    <motion.div
      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[12px] p-8 transition-all duration-300 relative group"
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{
        y: -4,
        borderColor: feature.borderHover,
        backgroundColor: feature.bgHover,
      }}
    >
      <div
        className="w-[52px] h-[52px] rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center mb-5 transition-all duration-300"
        style={{ color: feature.accentVar }}
      >
        {feature.icon}
      </div>
      <h3 className="font-mono text-[1.4rem] font-normal text-[var(--text-primary)] mb-2 tracking-[0.02em]">{feature.title}</h3>
      <p className="font-sans text-[0.85rem] leading-[1.6] text-[var(--text-muted)]">{feature.desc}</p>
    </motion.div>
  );
}
