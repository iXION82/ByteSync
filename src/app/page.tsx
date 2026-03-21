"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="home-page">
      {/* Scanline overlay */}
      <div className="crt-scanlines" aria-hidden="true" />

      {/* Hero Section */}
      <section className="hero">
        {/* Ambient glow orbs */}
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <div className="hero-content">
          {/* Retro badge */}
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="hero-badge-dot" />
            SYSTEM ONLINE — v1.0
          </motion.div>

          {/* Main title */}
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {">"} ByteSync_
          </motion.h1>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Real-Time Collaborative Code Editor
          </motion.p>

          <motion.p
            className="hero-description"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Create rooms, invite teammates, and code together in perfect sync.
            Built for developers who ship fast.
          </motion.p>

          {/* Auth-aware buttons */}
          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {isLoaded && isSignedIn ? (
              <>
                <Link href="/room/create" className="hero-btn hero-btn-primary" id="create-room-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Room
                </Link>
                <Link href="/room/join" className="hero-btn hero-btn-secondary" id="join-room-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Join Room
                </Link>
                <Link href="/room/solo" className="hero-btn hero-btn-tertiary" id="solo-room-btn">
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
                <Link href="/sign-up" className="hero-btn hero-btn-primary" id="get-started-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                  </svg>
                  Get Started
                </Link>
                <Link href="/sign-in" className="hero-btn hero-btn-secondary" id="sign-in-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Sign In
                </Link>
              </>
            ) : (
              <div className="hero-btn-skeleton" />
            )}
          </motion.div>
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="terminal-section">
        <motion.div
          className="terminal-window"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <span className="terminal-title">bytesync — session_01</span>
          </div>
          <div className="terminal-body">
            <div className="terminal-line">
              <span className="terminal-prompt">$</span>
              <span className="terminal-cmd">bytesync connect --room dev-team</span>
            </div>
            <div className="terminal-line terminal-output">
              ✓ Connected to room &quot;dev-team&quot; (3 users online)
            </div>
            <div className="terminal-line terminal-output">
              ✓ Syntax highlighting: TypeScript
            </div>
            <div className="terminal-line terminal-output">
              ✓ Auto-save: enabled
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$</span>
              <span className="terminal-cmd">Ready to code</span>
              <span className="terminal-cursor">█</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features">
        <motion.h2
          className="features-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {"// SYSTEM CAPABILITIES"}
        </motion.h2>

        <div className="features-grid">
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
            },
            {
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "Secure Rooms",
              desc: "Private rooms with access controls. Your code stays between you and your team.",
            },
          ].map((feature, i) => (
            <motion.div
              className="feature-card"
              key={feature.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
              <line x1="12" y1="2" x2="12" y2="22" opacity="0.4" />
            </svg>
            <span>ByteSync</span>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} ByteSync. Built for developers, by developers.
          </p>
          <div className="footer-links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className="footer-divider">|</span>
            <a href="#" target="_blank" rel="noopener noreferrer">Docs</a>
            <span className="footer-divider">|</span>
            <a href="#" target="_blank" rel="noopener noreferrer">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
