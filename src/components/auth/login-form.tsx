"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";

export function LoginForm({ next, initialMode = "signin" }: { next: string; initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const creds = { email: email.trim(), password };
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error;
        // No session comes back while the Supabase project has "Confirm email"
        // on: the account exists but can't sign in until the emailed link is opened.
        if (!data.session) {
          setNeedsConfirm(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(creds);
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(/invalid login credentials/i.test(msg) ? "Wrong email or password." : msg);
    } finally {
      setLoading(false);
    }
  };

  if (needsConfirm) {
    return (
      <div className="card p-4 text-sm">
        <p className="font-semibold">Confirm your email to finish signing up.</p>
        <p className="mt-1 text-foreground-secondary">We sent a link to {email.trim()}. Open it, then come back and sign in.</p>
        <button type="button" onClick={() => { setNeedsConfirm(false); setMode("signin"); }} className="mt-3 text-sm font-bold text-accent-ink">Back to sign in</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" />
      <Input
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === "signup" ? "Choose a password (8+ characters)" : "Password"}
        aria-label="Password"
      />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <p className="text-center text-sm text-foreground-secondary">
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }} className="font-bold text-accent-ink">
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
