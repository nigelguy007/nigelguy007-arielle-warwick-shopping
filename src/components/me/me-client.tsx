"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { api } from "@/lib/client/api";
import { fileToDataUrl } from "@/lib/client/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, ChipRow } from "@/components/ui/chip";
import { SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gbp } from "@/lib/utils";
import { MeSharing } from "@/components/share/me-sharing";
import type { AccommodationProfile, Profile, Purchase, SharedAccess, SharedAccessView, ShareInvite } from "@/lib/types";
import type { BudgetSummary } from "@/lib/budget/math";

const PRESETS = [100, 200, 300, 500];

export function MeClient({
  profile,
  accommodations,
  budget,
  purchases,
  mode,
  email,
  providers,
  invites,
  shares,
  sharedWithMe,
  appUrl,
}: {
  profile: Profile;
  accommodations: AccommodationProfile[];
  budget: BudgetSummary;
  purchases: Purchase[];
  mode: string;
  email: string | null;
  providers: Record<string, unknown>;
  invites: ShareInvite[];
  shares: SharedAccess[];
  sharedWithMe: SharedAccessView[];
  appUrl: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(budget.budget?.toString() ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [receiptSaving, setReceiptSaving] = useState<string | null>(null);
  const acc = accommodations.find((a) => a.slug === profile.accommodationSlug) ?? null;

  const attachReceipt = async (purchaseId: string, file: File) => {
    setReceiptSaving(purchaseId);
    setMsg(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      await api(`/api/purchases/${purchaseId}`, { method: "PATCH", body: JSON.stringify({ receiptImage: dataUrl }) });
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save that receipt");
    } finally {
      setReceiptSaving(null);
    }
  };

  const save = async (patch: Record<string, unknown>, key: string) => {
    setSaving(key);
    setMsg(null);
    try {
      await api("/api/profile", { method: "POST", body: JSON.stringify(patch) });
      setMsg("Saved");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(null);
      setTimeout(() => setMsg(null), 2000);
    }
  };

  return (
    <div className="px-4">
      <SectionTitle>Budget</SectionTitle>
      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-muted">Budget</p><p className="text-lg font-bold" data-testid="budget-amount">{budget.budget === null ? "Not set" : gbp(budget.budget)}</p></div>
          <div><p className="text-muted">Spent</p><p className="text-lg font-bold" data-testid="budget-spent">{gbp(budget.spent)}</p></div>
          <div><p className="text-muted">In basket</p><p className="text-lg font-bold">{gbp(budget.committed)}</p></div>
          <div><p className="text-muted">Remaining</p><p className={`text-lg font-bold ${budget.remaining !== null && budget.remaining < 0 ? "text-red-600" : "text-success"}`} data-testid="budget-remaining">{budget.remaining === null ? "—" : gbp(budget.remaining)}</p></div>
        </div>
        <ChipRow>
          {PRESETS.map((p) => (
            <Chip key={p} active={Number(amount) === p} onClick={() => setAmount(String(p))}>£{p}</Chip>
          ))}
        </ChipRow>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (amount !== "") void save({ budget: Number(amount) }, "budget"); }}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Custom amount" aria-label="Budget amount" />
          <Button type="submit" loading={saving === "budget"}>Set</Button>
        </form>
      </div>

      <SectionTitle>Warwick accommodation</SectionTitle>
      <div className="card space-y-3 p-4">
        <select className="h-12 w-full rounded-2xl border border-border bg-card px-3 text-base" value={profile.accommodationSlug ?? ""} onChange={(e) => save({ accommodationSlug: e.target.value || null }, "acc")} aria-label="Accommodation">
          <option value="">I don&apos;t know yet</option>
          {accommodations.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
        {acc ? (
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">{acc.verifiedAt ? <Badge tone="success">Verified {new Date(acc.verifiedAt).toLocaleDateString("en-GB")}</Badge> : <Badge tone="warn">Not verified</Badge>} <a className="font-semibold text-accent-ink" href={acc.officialUrl} target="_blank" rel="noopener noreferrer">Official page</a></p>
            <p>Bed size: <b>{acc.verifiedAt && acc.bedSize ? acc.bedSize.replace("_", " ") : "Not confirmed"}</b></p>
            <p>Bathroom: <b>{acc.verifiedAt && acc.ensuite !== null ? (acc.ensuite ? "En-suite" : "Shared") : "Not confirmed"}</b></p>
            <p>Hob: <b>{acc.verifiedAt && acc.hobType ? acc.hobType.replace("_", " ") : "Not confirmed"}</b></p>
            <p>Supplied: <b>{acc.verifiedAt && acc.suppliedAppliances.length ? acc.suppliedAppliances.join(", ") : "Not confirmed"}</b></p>
          </div>
        ) : null}
      </div>

      <SectionTitle>Default postcode</SectionTitle>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void save({ defaultPostcode: String(f.get("pc") ?? "").toUpperCase() || null }, "pc"); }}>
        <Input name="pc" defaultValue={profile.defaultPostcode ?? ""} placeholder="e.g. CV4 7AL" autoCapitalize="characters" aria-label="Default postcode" />
        <Button type="submit" loading={saving === "pc"}>Save</Button>
      </form>

      <SectionTitle>Purchases</SectionTitle>
      {purchases.length === 0 ? <p className="card p-4 text-sm text-muted">Nothing bought yet.</p> : (
        <ul className="card divide-y divide-border p-0 text-sm">
          {purchases.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate">{p.productSnapshot?.title ?? p.retailer ?? "Purchase"}</p>
                <p className="text-xs text-muted">{new Date(p.purchasedAt).toLocaleDateString("en-GB")}</p>
              </div>
              <span className="font-semibold">{gbp(p.paidPrice)}</span>
              <label className="tap relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border text-muted" aria-label={p.receiptImage ? "Replace receipt photo" : "Add receipt photo"}>
                {receiptSaving === p.id ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                ) : p.receiptImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- receipts are stored as inline data URLs, not static assets
                  <img src={p.receiptImage} alt="Receipt" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={receiptSaving === p.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void attachReceipt(p.id, file);
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <MeSharing ownerId={profile.id} invites={invites} shares={shares} sharedWithMe={sharedWithMe} appUrl={appUrl} isLocalDemo={mode === "local"} />

      <SectionTitle>Account</SectionTitle>
      <div className="card space-y-2 p-4 text-sm">
        <p>{mode === "local" ? "Demo mode (local data on this server). No sign-in needed." : `Signed in as ${email ?? ""}`}</p>
        <p className="text-xs text-muted">Providers: prices {String(providers.product)} · shops {String(providers.map)} · offers {String(providers.offer)} · agent {String(providers.ai)}</p>
        {mode !== "local" ? <a href="/auth/signout" className="inline-block font-semibold text-accent-ink">Sign out</a> : null}
        <button type="button" className="block text-xs text-muted underline" onClick={() => save({ onboardingComplete: false }, "onb").then(() => router.push("/onboarding"))}>Run setup again</button>
      </div>
      {msg ? <p className="pt-2 text-center text-sm text-muted">{msg}</p> : null}
      <div className="h-6" />
    </div>
  );
}
