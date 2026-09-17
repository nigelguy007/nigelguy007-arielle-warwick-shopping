"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { locationParams, readStoredLocation } from "@/lib/client/location";
import { gbp } from "@/lib/utils";
import type { CompareResult } from "@/lib/services/compare";
import type { BuyNextCandidate } from "@/lib/recommendations/buy-next";
import type { ScoredProduct } from "@/lib/ranking/value-score";

/** 200x150 photo-style card from the approved Stitch reference: a label
 * chip top-left, the item name and its best real price over the bottom of
 * the image. There's no retailer image feed yet, so the "photo" is the
 * sage gradient placeholder from globals.css rather than a fabricated one. */
export function BuyNextCard({ candidate }: { candidate: BuyNextCandidate }) {
  const router = useRouter();
  const [pick, setPick] = useState<ScoredProduct | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const item = candidate.item;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ itemId: item.id, ...locationParams(readStoredLocation()) });
    api<CompareResult>(`/api/products/search?${params}`)
      .then((r) => {
        if (cancelled) return;
        setPick(r.recommendations.bestValue ?? r.recommendations.cheapest ?? null);
      })
      .catch(() => {
        if (!cancelled) setPick(null);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const buy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pick) return;
    setAdding(true);
    try {
      await api(`/api/checklist/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "bought", paidPrice: pick.effectivePrice * item.qty, retailer: pick.product.retailer }) });
      router.refresh();
    } finally {
      setAdding(false);
    }
  };

  const label = item.priority === "essential" ? "Essential" : item.timing === "buy_before" ? "Before move-in" : null;
  const subtitle = pick === undefined ? "Checking prices…" : pick === null ? "Compare prices" : `${gbp(pick.effectivePrice)} · ${pick.product.retailer}`;
  const href = pick ? `/checklist/${item.id}` : `/shop?q=${encodeURIComponent(item.item)}&itemId=${item.id}`;

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="photo-placeholder relative h-[150px] w-[200px] shrink-0 overflow-hidden rounded-[var(--radius-card)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`${item.item}: ${subtitle}`}
    >
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)" }} />
      {label ? <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#121212]">{label}</span> : null}
      {pick ? (
        <span
          onClick={buy}
          role="button"
          tabIndex={0}
          aria-label={`Mark ${item.item} bought`}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); buy(e as unknown as React.MouseEvent); } }}
          className="absolute top-3 right-3 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-on-accent"
        >
          {adding ? "…" : "Buy"}
        </span>
      ) : null}
      <div className="absolute right-3 bottom-3 left-3 text-white">
        <p className="truncate text-[15px] leading-tight font-bold">{item.item}{item.qty > 1 ? ` × ${item.qty}` : ""}</p>
        <p className={`mt-0.5 truncate text-xs text-white/85 ${pick === undefined ? "animate-pulse" : ""}`}>{subtitle}</p>
      </div>
    </button>
  );
}
