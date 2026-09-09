"use client";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the link");
    } finally {
      setLoading(false);
    }
  };

  if (sent) return <p className="card p-4 text-sm">Check your email for a sign-in link. Open it on this phone.</p>;
  return (
    <form onSubmit={submit} className="space-y-3">
      <Input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" />
      <Button type="submit" size="lg" className="w-full" loading={loading}>Email me a sign-in link</Button>
      {error ? <p className="text-sm text-warn">{error}</p> : null}
      <p className="text-xs text-muted">No password needed. The link signs you in on this device.</p>
    </form>
  );
}
