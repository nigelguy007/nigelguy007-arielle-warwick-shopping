"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { locationParams, readStoredLocation } from "@/lib/client/location";
import { ProductCard } from "@/components/shop/product-card";
import { Badge, StampBadge } from "@/components/ui/badge";
import { gbp } from "@/lib/utils";
import type { CompareResult } from "@/lib/services/compare";
import type { BuyNextCandidate } from "@/lib/recommendations/buy-next";
import type { ScoredProduct } from "@/lib/ranking/value-score";
import { useRouter } from "next/navigation";

export function BuyNextCard({ candidate }: { candidate: BuyNextCandidate }) {
  const router = useRouter();
  const [pick, setPick] = useState<ScoredProduct | null | undefined>(undefined);
  const [meta, setMeta] = useState<{ mock: boolean; warning: string | null; error: string | null } | null>(null);
  const [adding, setAdding] = useState(false);
  const item = candidate.item;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ itemId: item.id, ...locationParams(readStoredLocation()) });
    api<CompareResult>(`/api/products/search?${params}`)
      .then((r) => {
        if (cancelled) return;
        setPick(r.recommendations.bestValue ?? r.recommendations.cheapest ?? null);
        setMeta({ mock: r.mock, warning: r.warning, error: r.error });
      })
      .catch(() => {
        if (!cancelled) setPick(null);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const add = async () => {
    if (!pick) return;
    setAdding(true);
    try {
      await api("/api/basket", { method: "POST", body: JSON.stringify({ product: pick.product, quantity: item.qty, checklistItemId: item.id }) });
      router.refresh();
    } finally {
      setAdding(false);
    }
  };
  const bought = async () => {
    await api(`/api/checklist/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "bought", ...(pick ? { paidPrice: pick.effectivePrice * item.qty, retailer: pick.product.retailer } : {}) }) });
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <Link href={`/checklist/${item.id}`} className="flex items-center justify-between px-1">
        <div>
          <p className="font-semibold">{item.item}{item.qty > 1 ? ` × ${item.qty}` : ""}</p>
          <p className="text-xs text-muted">{candidate.reason}{candidate.estimatedCost !== null ? ` · est. ${gbp(candidate.estimatedCost)}` : ""}</p>
        </div>
        {item.priority === "essential" ? <StampBadge>Essential</StampBadge> : <Badge tone="neutral">{item.priority}</Badge>}
      </Link>
      {pick === undefined ? <div className="card h-28 animate-pulse bg-black/5" /> : null}
      {pick ? <ProductCard pick={pick} label={meta?.mock ? undefined : "Best value"} compact onAdd={add} adding={adding} onBought={bought} onNearby={() => router.push(`/map?retailer=${encodeURIComponent(pick.product.retailer)}&q=${encodeURIComponent(item.item)}`)} /> : null}
      {pick === null ? (
        <div className="card p-4 text-sm text-muted">
          {meta?.error ?? meta?.warning ?? "No product suggestion yet."}{" "}
          <Link href={`/shop?q=${encodeURIComponent(item.item)}&itemId=${item.id}`} className="font-semibold text-accent-ink">Compare</Link>
        </div>
      ) : null}
    </div>
  );
}
