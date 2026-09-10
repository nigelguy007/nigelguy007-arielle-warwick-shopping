"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SharedAccess, SharedAccessView, ShareInvite } from "@/lib/types";

function isLive(invite: ShareInvite): boolean {
  return !invite.redeemedAt && Date.parse(invite.expiresAt) > Date.now();
}

export function MeSharing({
  ownerId,
  invites,
  shares,
  sharedWithMe,
  appUrl,
  isLocalDemo,
}: {
  ownerId: string;
  invites: ShareInvite[];
  shares: SharedAccess[];
  sharedWithMe: SharedAccessView[];
  appUrl: string;
  isLocalDemo: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API unavailable (e.g. not HTTPS) - the link is still shown to copy by hand.
    }
  };

  /** Opens the phone's native share sheet (WhatsApp, SMS, email, etc.) -
   * the same picker any other app on the phone would open with. Falls back
   * to copying the link on browsers/desktops without share support, or if
   * the person just closes the sheet without picking anything. */
  const share = async (url: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Warwick Move-In", text: "Follow my Warwick move-in checklist and budget:", url });
        return;
      } catch {
        // Cancelled, or share isn't actually wired up here - fall back to copy.
      }
    }
    copy(url);
  };

  const pending = invites.filter(isLive);

  return (
    <>
      <SectionTitle
        action={
          <Link href={`/shared/${ownerId}`} className="text-xs font-semibold text-accent-ink">
            Preview parent view
          </Link>
        }
      >
        Share with a parent
      </SectionTitle>
      <div className="card space-y-3 p-4">
        <p className="text-sm text-muted">Send a link so a parent can see your checklist progress and budget, and log what they&apos;ve put toward it.</p>
        {isLocalDemo ? <p className="text-xs text-muted">Demo mode: this server only has one account, so an invite link previews your own data rather than a real second person&apos;s. It works for real in Supabase mode.</p> : null}
        <Button type="button" onClick={() => run("create", () => api("/api/share/invites", { method: "POST", body: JSON.stringify({ canViewChecklist: true, canViewBudget: true }) }))} loading={busy === "create"}>
          Create invite link
        </Button>

        {pending.length > 0 ? (
          <ul className="space-y-2 pt-1">
            {pending.map((i) => {
              const url = `${appUrl}/share/${i.code}`;
              return (
                <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2 text-sm">
                  <span className="truncate font-mono">{i.code}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="sm" onClick={() => share(url)}>
                      Share
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => copy(url)}>
                      {copied === url ? "Copied" : "Copy"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" loading={busy === `invite-${i.id}`} onClick={() => run(`invite-${i.id}`, () => api(`/api/share/invites/${i.id}`, { method: "DELETE" }))}>
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {shares.length > 0 ? (
          <>
            <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Active access</p>
            <ul className="space-y-2">
              {shares.map((sh) => (
                <li key={sh.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2 text-sm">
                  <span>Parent · since {new Date(sh.createdAt).toLocaleDateString("en-GB")}</span>
                  <Button type="button" size="sm" variant="danger" loading={busy === `share-${sh.viewerId}`} onClick={() => run(`share-${sh.viewerId}`, () => api(`/api/share/access/${sh.viewerId}`, { method: "DELETE" }))}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {error ? <p className="text-sm text-warn">{error}</p> : null}
      </div>

      {sharedWithMe.length > 0 ? (
        <>
          <SectionTitle>Shared with me</SectionTitle>
          <ul className="card divide-y divide-border p-0 text-sm">
            {sharedWithMe.map((sh) => (
              <li key={sh.id}>
                <Link href={`/shared/${sh.ownerId}`} className="flex items-center justify-between px-4 py-3">
                  <span>{sh.ownerFirstName || "Move-in checklist"}</span>
                  <Badge tone="accent">View</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
