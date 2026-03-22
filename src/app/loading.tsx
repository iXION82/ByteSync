export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.3s_ease]">
        <span className="inline-block w-9 h-9 border-[3px] border-[var(--border-color)] border-t-[var(--accent)] rounded-full animate-[spin_0.7s_linear_infinite]" />
        <p className="text-[0.9rem] text-[var(--text-muted)] font-medium">Loading...</p>
      </div>
    </div>
  );
}
