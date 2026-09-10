"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2, Check, Search, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Empty } from "@/components/ui/empty";
import { gbp } from "@/lib/utils";
import { useLocationContext } from "@/lib/client/location";
import type { BasketItem } from "@/lib/types";
import type { BasketTotals, BudgetSummary } from "@/lib/budget/math";
import { OPTIMISE_LABELS, type OptimiseMode, type OptimisedBasket } from "@/lib/services/basket-optimise";

export function BasketView({ basket, totals, budget, onSearch }: { basket: BasketItem[]; totals: BasketTotals; budget: BudgetSummary; onSearch?: (q: string) => void }) {
  const router = useRouter();
  const loc = useLocationContext();
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<OptimiseMode | null>(null);
  const [preview, setPreview] = useState<OptimisedBasket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await api(`/api/basket/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };
  const bought = async (id: string) => {
    setBusy(id);
    try {
      await api(`/api/basket/${id}`, { method: "POST", body: JSON.stringify({}) });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };
  const optimise = async (m: OptimiseMode, apply = false) => {
    setMode(m);
    setBusy("optimise");
    setError(null);
    try {
      const p = loc.location?.coords ? { lat: loc.location.coords.lat, lng: loc.location.coords.lng, label: loc.location.label, source: loc.location.source, postcode: loc.location.postcode } : null;
      const res = await api<OptimisedBasket>("/api/basket/optimise", { method: "POST", body: JSON.stringify({ mode: m, location: p, apply }) });
      setPreview(apply ? null : res);
      if (apply) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't optimise the basket");
    } finally {
      setBusy(null);
    }
  };

  if (basket.length === 0) return <Empty title="Your basket is empty" body="Search for an item above and add the option you like." />;

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted">
            {totals.retailerCount} {totals.retailerCount === 1 ? "shop" : "shops"} · {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
          </p>
          <p className="font-display text-2xl font-bold">{gbp(totals.estimatedTotal)}</p>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
          {totals.delivery > 0 ? <span>incl. {gbp(totals.delivery)} delivery</span> : null}
          {totals.confirmedSavings > 0 ? <span className="text-success">Confirmed savings {gbp(totals.confirmedSavings)}</span> : null}
          {totals.potentialSavings > 0 ? <span>Potential savings {gbp(totals.potentialSavings)} (unverified, not applied)</span> : null}
          {budget.remainingAfterBasket !== null ? <span className={budget.remainingAfterBasket < 0 ? "text-danger" : ""}>Budget after basket {gbp(budget.remainingAfterBasket)}</span> : null}
        </div>
      </div>

      <ChipRow>
        {(Object.keys(OPTIMISE_LABELS) as OptimiseMode[]).map((m) => (
          <Chip key={m} active={mode === m} onClick={() => optimise(m)} disabled={busy === "optimise"}>
            {OPTIMISE_LABELS[m]}
          </Chip>
        ))}
      </ChipRow>
      {error ? <p className="text-sm text-warn">{error}</p> : null}
      {preview ? (
        <div className="card border-accent p-4">
          <p className="text-sm font-semibold">{OPTIMISE_LABELS[preview.mode]}: {gbp(preview.totals.estimatedTotal)} across {preview.totals.retailerCount} {preview.totals.retailerCount === 1 ? "shop" : "shops"}</p>
          <p className="mt-1 text-xs text-muted">{preview.note}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {preview.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="truncate">{i.productSnapshot.title} · {i.productSnapshot.retailer}</span>
                <span className="shrink-0">{gbp(i.productSnapshot.totalPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => optimise(preview.mode, true)} loading={busy === "optimise"}>Use this</Button>
            <Button size="sm" variant="ghost" onClick={() => { setPreview(null); setMode(null); }}>Keep mine</Button>
          </div>
        </div>
      ) : null}

      {totals.byRetailer.map((group) => (
        <section key={group.retailer} className="card p-0">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold">{group.retailer}</h3>
            <span className="text-sm font-semibold">{gbp(group.total)}</span>
          </header>
          <ul className="divide-y divide-border">
            {group.items.map((line) => (
              <li key={line.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium">{line.productSnapshot.title}</p>
                    <p className="text-xs text-muted">
                      {line.quantity} × {gbp(line.productSnapshot.currentPrice)}
                      {line.productSnapshot.deliveryPrice ? ` + ${gbp(line.productSnapshot.deliveryPrice)} delivery` : ""}
                      {line.productSnapshot.sourceConfidence === "mock" ? " · " : ""}
                      {line.productSnapshot.sourceConfidence === "mock" ? <Badge tone="mock">Mock</Badge> : null}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{gbp(line.productSnapshot.currentPrice * line.quantity)}</p>
                </div>
                <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
                  <a href={line.productSnapshot.productUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex shrink-0 items-center gap-1 rounded-xl bg-accent px-3 text-xs font-semibold text-white"><ExternalLink className="h-3.5 w-3.5" /> Open retailer</a>
                  <Button size="sm" variant="success" className="shrink-0 text-xs" onClick={() => bought(line.id)} loading={busy === line.id}><Check className="h-3.5 w-3.5" /> Mark bought</Button>
                  {onSearch ? <Button size="sm" variant="ghost" className="shrink-0 text-xs" onClick={() => onSearch(line.productSnapshot.title)}><Search className="h-3.5 w-3.5" /> Find cheaper</Button> : null}
                  <Link href={`/map?retailer=${encodeURIComponent(line.productSnapshot.retailer)}&q=${encodeURIComponent(line.productSnapshot.title)}`} className="tap inline-flex shrink-0 items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold"><MapPin className="h-3.5 w-3.5" /> Find nearby</Link>
                  <Link href={`/shop?offers=${encodeURIComponent(line.productSnapshot.retailer)}`} className="tap inline-flex shrink-0 items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold"><Ticket className="h-3.5 w-3.5" /> Find voucher</Link>
                  <Button size="sm" variant="danger" className="shrink-0 text-xs" onClick={() => remove(line.id)} loading={busy === line.id}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
