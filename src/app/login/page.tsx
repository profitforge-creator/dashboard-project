"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/BrandMark";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "check-email" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setStatus("loading");
    setError("");
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        setStatus("error");
        setError(error.message);
        return;
      }
      if (!data.session) {
        // Email confirmation is required by the project's auth settings.
        setStatus("check-email");
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-blue shadow-[0_0_40px_-10px_rgba(52,227,161,0.5)]">
            <BrandMark size={26} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Amari</h1>
          <p className="text-center text-sm text-text-secondary">Your personal life dashboard.</p>
        </div>

        {status === "check-email" ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-text">
              Almost there — confirm <span className="font-medium">{email}</span> once to finish creating your account, then sign in with your password.
            </p>
            <button onClick={() => { setStatus("idle"); setMode("signin"); }} className="mt-4 text-sm font-medium text-blue-light hover:underline">
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex rounded-xl border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => { setMode("signin"); setStatus("idle"); setError(""); }}
                className={`min-h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${mode === "signin" ? "bg-blue text-white" : "text-text-secondary"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setStatus("idle"); setError(""); }}
                className={`min-h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${mode === "signup" ? "bg-blue text-white" : "text-text-secondary"}`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
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
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-card px-4 text-[15px] text-text placeholder:text-text-secondary outline-none transition-colors focus:border-blue"
                />
              </div>
              {status === "error" && <p className="text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={status === "loading"}
                className="min-h-11 rounded-xl bg-blue px-4 text-[15px] font-semibold text-white transition-colors hover:bg-blue/90 disabled:opacity-50"
              >
                {status === "loading" ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
