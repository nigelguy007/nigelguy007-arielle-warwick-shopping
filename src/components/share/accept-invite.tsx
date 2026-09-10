"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import type { SharedAccess } from "@/lib/types";

export function AcceptInvite({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accept = async () => {
    setLoading(true);
    setError(null);
    try {
      const { access } = await api<{ access: SharedAccess }>("/api/share/redeem", { method: "POST", body: JSON.stringify({ code }) });
      router.push(`/shared/${access.ownerId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm text-muted">
        Invite code: <span className="font-mono font-semibold text-foreground">{code}</span>
      </p>
      <Button size="lg" className="w-full" loading={loading} onClick={accept}>
        Accept &amp; view
      </Button>
      {error ? <p className="text-sm text-warn">{error}</p> : null}
    </div>
  );
}
