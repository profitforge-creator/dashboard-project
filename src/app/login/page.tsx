"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-[0_0_40px_-10px_rgba(47,107,255,0.5)]">
            <span className="h-5 w-5 rounded-full bg-blue shadow-[0_0_16px_rgba(47,107,255,0.8)]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Amari</h1>
          <p className="text-center text-sm text-text-secondary">Your personal life dashboard.</p>
        </div>

        {status === "sent" ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-text">Check <span className="font-medium">{email}</span> for a sign-in link.</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm font-medium text-blue-light hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-4 text-[15px] text-text placeholder:text-text-secondary outline-none transition-colors focus:border-blue"
            />
            {status === "error" && <p className="text-sm text-error">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="min-h-11 rounded-xl bg-blue px-4 text-[15px] font-semibold text-white transition-colors hover:bg-blue/90 disabled:opacity-50"
            >
              {status === "sending" ? "Sending link…" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
