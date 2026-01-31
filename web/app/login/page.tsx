"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || "Invalid password");
      }
    } catch (err) {
      setError("Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--tartarus-void)]">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--tartarus-teal)]/5 via-transparent to-[var(--tartarus-gold)]/5" />
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-[var(--tartarus-teal)]/10 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[var(--tartarus-gold)]/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--tartarus-gold)]/5 blur-3xl" />

      {/* Login card */}
      <div className="relative mx-4 w-full max-w-md">
        <div className="rounded-2xl border border-[var(--tartarus-border)] bg-[var(--tartarus-surface)]/80 p-8 shadow-2xl backdrop-blur-md">
          {/* Logo & Title */}
          <div className="mb-8 flex flex-col items-center">
            {/* Large Kronus Logo */}
            <div className="relative mb-6">
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-br from-[var(--tartarus-gold)]/30 to-[var(--tartarus-teal)]/20 blur-2xl" />
              <div className="relative h-32 w-32 overflow-hidden rounded-full shadow-2xl ring-4 ring-[var(--tartarus-gold)]/30 ring-offset-4 ring-offset-[var(--tartarus-surface)]">
                <Image
                  src="/chronus-logo.png"
                  alt="Kronus"
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[var(--tartarus-ivory)]">
              Developer Journal
            </h1>
            <p className="mt-2 text-center text-[var(--tartarus-ivory-muted)]">
              Enter the realm of your code chronicles
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--tartarus-ivory-dim)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] px-4 py-3 pr-12 text-[var(--tartarus-ivory)] transition-all placeholder:text-[var(--tartarus-ivory-faded)] focus:border-[var(--tartarus-teal)] focus:ring-2 focus:ring-[var(--tartarus-teal)]/20 focus:outline-none"
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--tartarus-ivory-faded)] transition-colors hover:text-[var(--tartarus-ivory)]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-[var(--tartarus-error)]/30 bg-[var(--tartarus-error)]/10 px-4 py-3 text-sm text-[var(--tartarus-error)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-gold-bright)] px-4 py-3 font-semibold text-[var(--tartarus-void)] transition-all hover:opacity-90 hover:shadow-[var(--tartarus-gold)]/20 hover:shadow-lg focus:ring-2 focus:ring-[var(--tartarus-gold)] focus:ring-offset-2 focus:ring-offset-[var(--tartarus-surface)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Entering...
                </>
              ) : (
                "Enter the Journal"
              )}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-6 border-t border-[var(--tartarus-border)] pt-6">
            <p className="text-center text-xs text-[var(--tartarus-ivory-faded)]">
              Default:{" "}
              <code className="rounded bg-[var(--tartarus-deep)] px-2 py-1 text-[var(--tartarus-teal)]">
                admin
              </code>
            </p>
            <p className="mt-2 text-center text-xs text-[var(--tartarus-ivory-faded)]">
              Set{" "}
              <code className="rounded bg-[var(--tartarus-deep)] px-1.5 py-0.5 text-[var(--tartarus-gold)]">
                ADMIN_PASSWORD_HASH
              </code>{" "}
              to customize
            </p>
          </div>
        </div>

        {/* Subtle branding */}
        <p className="mt-6 text-center text-xs text-[var(--tartarus-ivory-faded)]">
          Tartarus Journal System
        </p>
      </div>
    </div>
  );
}
