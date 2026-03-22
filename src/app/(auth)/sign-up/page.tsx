import SignUpForm from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 pt-20 bg-[var(--bg-primary)] relative overflow-hidden before:content-[''] before:absolute before:-top-[50%] before:-left-[50%] before:w-[200%] before:h-[200%] before:pointer-events-none before:[background:radial-gradient(ellipse_at_30%_20%,var(--accent-glow)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,var(--accent-glow)_0%,transparent_50%))]">
      <SignUpForm />
    </div>
  );
}
