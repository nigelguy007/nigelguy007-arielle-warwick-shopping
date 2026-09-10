"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { locationParams, readStoredLocation } from "@/lib/client/location";
import { gbp } from "@/lib/utils";
import type { CompareResult } from "@/lib/services/compare";
import type { BuyNextCandidate } from "@/lib/recommendations/buy-next";
import type { ScoredProduct } from "@/lib/ranking/value-score";

/** Compact 168px horizontal-scroll product card, exact treatment from the
 * design handoff's Home "Buy next" row. Photo is an intentional placeholder
 * pending a live retailer image feed - see .photo-placeholder in globals.css. */
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

  if (pick === undefined) {
    return <div className="glass-card h-[190px] w-[168px] shrink-0 animate-pulse" />;
  }
  if (pick === null) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/shop?q=${encodeURIComponent(item.item)}&itemId=${item.id}`)}
        className="glass-card flex h-[190px] w-[168px] shrink-0 flex-col items-start justify-end p-3 text-left"
      >
        <p className="text-[13px] leading-[1.25] font-bold">{item.item}</p>
        <p className="mt-1 text-[11px] text-accent-ink">Compare prices</p>
      </button>
    );
  }

  return (
    <button type="button" onClick={() => router.push(`/checklist/${item.id}`)} className="glass-card w-[168px] shrink-0 overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-accent">
      <div className="photo-placeholder h-24">
        <span className="text-[9px]">photo</span>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <div className="h-[33px] overflow-hidden text-[13px] leading-[1.25] font-bold">{item.item}</div>
        <div className="text-[11px] text-foreground-secondary">{pick.product.retailer}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="tabular text-[15px] font-extrabold">{gbp(pick.effectivePrice)}</span>
          <span
            onClick={buy}
            role="button"
            tabIndex={0}
            aria-label={`Mark ${item.item} bought`}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); buy(e as unknown as React.MouseEvent); } }}
            className="rounded-xl bg-accent px-3 py-[5px] text-[11px] font-bold text-on-accent"
          >
            {adding ? "…" : "Buy"}
          </span>
        </div>
      </div>
    </button>
  );
}
