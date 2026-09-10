"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, MapPin, Plus, Check, Star } from "lucide-react";
import { api } from "@/lib/client/api";
import { locationParams, useLocationContext } from "@/lib/client/location";
import { useRequest } from "@/lib/client/use-request";
import { OfferCard, StudentLinks } from "./offer-card";
import { SourceLine } from "@/components/ui/source-line";
import { Empty } from "@/components/ui/empty";
import { SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/map/location-picker";
import { gbp, km } from "@/lib/utils";
import type { CompareResult } from "@/lib/services/compare";
import type { ScoredProduct } from "@/lib/ranking/value-score";

type Serializable<T> = T; // API returns JSON of the same shape

/** One row of the price-list card: store name + BEST badge on the cheapest
 * pick, meta (delivery/distance/stock), price right-aligned bold tabular. */
function PriceRow({ pick, label, best, compact, onAdd, onBought, onNearby, adding }: { pick: ScoredProduct; label?: string; best?: boolean; compact?: boolean; onAdd?: () => void; onBought?: () => void; onNearby?: () => void; adding?: boolean }) {
  const p = pick.product;
  const mock = p.sourceConfidence === "mock";
  const meta = [p.availability, pick.nearbyStore ? `${pick.nearbyStore.name} · ${km(pick.nearbyStore.distanceMeters)}` : null, p.deliveryPrice ? `incl. ${gbp(p.deliveryPrice)} delivery` : p.deliveryPrice === 0 ? "free delivery" : null].filter(Boolean).join(" · ");

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-bold">{p.retailer}</span>
            {best ? (
              <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold tracking-[0.4px] text-on-accent">BEST</span>
            ) : label ? (
              <span className="text-[11px] font-semibold text-muted">{label}</span>
            ) : null}
            {mock ? <Badge tone="mock">Mock</Badge> : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-foreground-secondary">{p.title}</p>
          {meta ? <p className="mt-0.5 text-xs text-muted">{meta}</p> : null}
          {typeof p.rating === "number" ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <Star className="h-3.5 w-3.5 fill-current text-warn" /> {p.rating.toFixed(1)} {p.reviewCount ? `(${p.reviewCount.toLocaleString("en-GB")})` : ""}
            </p>
          ) : null}
          {pick.verifiedOffer ? <p className="mt-0.5 text-xs text-success">Verified offer: {pick.verifiedOffer.title}{pick.verifiedOffer.code ? ` · code ${pick.verifiedOffer.code}` : ""}</p> : null}
          {pick.unverifiedOffer ? <p className="mt-0.5 text-xs text-muted">Possible saving (unverified): {pick.unverifiedOffer.title}</p> : null}
          {pick.warnings.map((w) => (
            <p key={w} className="mt-0.5 text-xs text-warn">⚠ {w}</p>
          ))}
          {pick.reasons.length && !compact ? <p className="mt-0.5 text-xs text-muted">{pick.reasons.join(" · ")}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="tabular text-[17px] font-extrabold">{gbp(pick.effectivePrice)}</div>
          {pick.verifiedOffer && pick.effectivePrice < p.totalPrice ? <div className="tabular text-xs text-muted line-through">{gbp(p.totalPrice)}</div> : null}
        </div>
      </div>
      {onAdd || onBought || onNearby ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <a href={p.productUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex h-9 items-center gap-1 rounded-full bg-accent px-3.5 text-sm font-semibold text-on-accent">
            <ExternalLink className="h-3.5 w-3.5" /> Buy online
          </a>
          {onNearby ? (
            <Button variant="ghost" size="sm" onClick={onNearby}>
              <MapPin className="h-3.5 w-3.5" /> Nearby
            </Button>
          ) : null}
          {onAdd ? (
            <Button variant="secondary" size="sm" onClick={onAdd} loading={adding}>
              <Plus className="h-3.5 w-3.5" /> Add to basket
            </Button>
          ) : null}
          {onBought ? (
            <Button variant="success" size="sm" onClick={onBought}>
              <Check className="h-3.5 w-3.5" /> Mark bought
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CompareView({ query, itemId, onNearby, showOffers = true }: { query?: string; itemId?: string; onNearby?: (retailer: string) => void; showOffers?: boolean }) {
  const router = useRouter();
  const loc = useLocationContext();
  const [adding, setAdding] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const locParams = locationParams(loc.location);
  const key = query || itemId ? `compare:${query ?? ""}:${itemId ?? ""}:${JSON.stringify(locParams)}` : null;
  const { data, error: requestError, loading, refresh } = useRequest<Serializable<CompareResult>>(key, ({ refresh: force }) => api<CompareResult>(`/api/products/search?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(itemId ? { itemId } : {}), ...locParams, ...(force ? { refresh: "1" } : {}) })}`));
  const error = requestError ?? data?.error ?? null;

  const add = async (pick: ScoredProduct) => {
    setAdding(pick.product.id);
    try {
      await api("/api/basket", { method: "POST", body: JSON.stringify({ product: pick.product, quantity: data?.item?.qty ?? 1, checklistItemId: data?.item?.id ?? itemId ?? null }) });
      setToast(`Added ${pick.product.title} to your basket`);
      router.refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Couldn't add that");
    } finally {
      setAdding(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const bought = async (pick: ScoredProduct) => {
    const id = data?.item?.id ?? itemId;
    try {
      if (id) await api(`/api/checklist/${id}`, { method: "PATCH", body: JSON.stringify({ status: "bought", paidPrice: pick.effectivePrice * (data?.item?.qty ?? 1), retailer: pick.product.retailer }) });
      else await api("/api/purchases", { method: "POST", body: JSON.stringify({ retailer: pick.product.retailer, paidPrice: pick.effectivePrice }) });
      setToast("Marked as bought");
      router.refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setTimeout(() => setToast(null), 2500);
    }
  };

  if (!query && !itemId) return null;
  const recs = data?.recommendations;
  const picks = recs ? ([["Cheapest", recs.cheapest], ["Best value", recs.bestValue], ["Nearby", recs.nearby]] as const).filter(([, p]) => p) : [];
  const shownIds = new Set(picks.map(([, p]) => p!.product.id));
  const rest = recs?.all.filter((p) => !shownIds.has(p.product.id)) ?? [];
  const totalCount = recs?.all.length ?? 0;

  return (
    <div className="space-y-3">
      {data?.warning ? <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">{data.warning}</p> : null}
      {data && !data.error ? <SourceLine provider={data.provider} checkedAt={data.checkedAt} mock={data.mock} confidence={data.results[0]?.sourceConfidence} onRefresh={refresh} refreshing={loading} /> : null}
      {loading && !data ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-black/5" />
          ))}
        </div>
      ) : null}
      {error ? <Empty title={error} action={<button className="tap text-sm font-semibold text-accent-ink" onClick={refresh}>Try again</button>} /> : null}
      {data && !error && picks.length === 0 && !loading ? (
        <Empty title={`No suitable results for “${data.query}”`} body={recs?.excluded.length ? `Excluded: ${recs.excluded.map((e) => `${e.product.title} (${e.reason})`).join("; ")}` : undefined} />
      ) : null}
      {picks.length > 0 ? (
        <>
          <p className="px-1 text-base font-bold">{totalCount} price{totalCount === 1 ? "" : "s"} found</p>
          <div className="glass-card divide-y divide-border overflow-hidden p-0">
            {picks.map(([label, pick]) => (
              <PriceRow key={pick!.product.id} label={label} best={label === "Cheapest"} pick={pick!} onAdd={() => add(pick!)} onBought={() => bought(pick!)} onNearby={onNearby ? () => onNearby(pick!.product.retailer) : undefined} adding={adding === pick!.product.id} />
            ))}
            {showAll ? rest.map((pick) => <PriceRow key={pick.product.id} pick={pick} compact onAdd={() => add(pick)} onBought={() => bought(pick)} adding={adding === pick.product.id} />) : null}
          </div>
        </>
      ) : null}
      {rest.length > 0 ? (
        <button type="button" className="tap w-full text-sm font-semibold text-accent-ink" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Hide" : `Show ${rest.length} more`}
        </button>
      ) : null}
      {recs && recs.excluded.length > 0 ? (
        <details className="px-1 text-xs text-muted">
          <summary className="tap cursor-pointer font-semibold">Not shown ({recs.excluded.length})</summary>
          <ul className="mt-1 space-y-1">
            {recs.excluded.map((e) => (
              <li key={e.product.id}>
                {e.product.title} · {e.product.retailer} — <span className="text-warn">{e.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {data && !loc.location && (
        <div className="card p-4">
          <SectionTitle>Nearby options</SectionTitle>
          <LocationPicker ctx={loc} compact />
        </div>
      )}
      {showOffers && data && data.offers.length > 0 ? (
        <>
          <SectionTitle>Vouchers &amp; discounts</SectionTitle>
          {data.offers.filter((o) => o.type !== "student" || o.verified).slice(0, 4).map((o) => (
            <OfferCard key={o.id} offer={o} />
          ))}
          <StudentLinks offers={data.offers} />
        </>
      ) : null}
      {toast ? (
        <div role="status" className="fixed inset-x-4 z-50 rounded-2xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-white shadow-lg" style={{ bottom: "calc(var(--sab) + 5.5rem)" }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
