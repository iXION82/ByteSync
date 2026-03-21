import Link from "next/link";

export default function Home() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-glow hero-glow-3" />

        <div className="hero-content">
          <div className="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Next.js Starter Template
          </div>

          <h1 className="hero-title">
            Build faster with
            <span className="hero-gradient-text"> authentication </span>
            and
            <span className="hero-gradient-text"> database </span>
            ready to go
          </h1>

          <p className="hero-description">
            A production-ready Next.js starter with Clerk authentication,
            MongoDB integration, custom auth pages, and a premium design system.
            Clone, configure, and ship.
          </p>

          <div className="hero-actions">
            <Link href="/sign-up" className="hero-cta-primary">
              Get Started Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link href="/sign-in" className="hero-cta-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="feature-title">Clerk Authentication</h3>
            <p className="feature-description">
              Secure sign-in and sign-up with email verification, multi-factor auth,
              and session management — all powered by Clerk.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <h3 className="feature-title">MongoDB Ready</h3>
            <p className="feature-description">
              Cached connection utility that prevents leaks during dev hot-reloads.
              User model with CRUD helpers included.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <h3 className="feature-title">Custom Auth Pages</h3>
            <p className="feature-description">
              Beautiful, customizable sign-in and sign-up forms with glassmorphism
              design. Fully yours to style.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <h3 className="feature-title">Production Ready</h3>
            <p className="feature-description">
              TypeScript, Tailwind CSS, ESLint, and best practices baked in.
              Deploy to Vercel in one click.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>
          Built with Next.js, Clerk, and MongoDB •{" "}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
