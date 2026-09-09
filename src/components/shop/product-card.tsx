"use client";
import Image from "next/image";
import { ExternalLink, MapPin, Plus, Check, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gbp, km } from "@/lib/utils";
import type { ScoredProduct } from "@/lib/ranking/value-score";

export function ProductCard({ pick, label, onAdd, onBought, onNearby, adding, compact }: { pick: ScoredProduct; label?: string; onAdd?: () => void; onBought?: () => void; onNearby?: () => void; adding?: boolean; compact?: boolean }) {
  const p = pick.product;
  const mock = p.sourceConfidence === "mock";
  return (
    <article className="card overflow-hidden p-0">
      <div className="flex gap-3 p-4">
        {p.imageUrl ? (
          <Image src={p.imageUrl} alt="" width={72} height={72} unoptimized className="h-18 w-18 shrink-0 rounded-xl object-cover bg-black/5" />
        ) : (
          <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-bold text-accent-ink" aria-hidden>
            {p.retailer.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {label ? <Badge tone="accent">{label}</Badge> : null}
            {mock ? <Badge tone="mock">Mock</Badge> : null}
          </div>
          <h3 className="mt-1 line-clamp-2 font-semibold leading-snug">{p.title}</h3>
          <p className="text-sm text-muted">{p.retailer}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold">{gbp(pick.effectivePrice)}</span>
            {pick.verifiedOffer && pick.effectivePrice < p.totalPrice ? <span className="text-sm text-muted line-through">{gbp(p.totalPrice)}</span> : null}
            {p.deliveryPrice ? <span className="text-xs text-muted">incl. {gbp(p.deliveryPrice)} delivery</span> : p.deliveryPrice === 0 ? <span className="text-xs text-success">free delivery</span> : null}
          </div>
          {typeof p.rating === "number" ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <Star className="h-3.5 w-3.5 fill-current text-warn" /> {p.rating.toFixed(1)} {p.reviewCount ? `(${p.reviewCount.toLocaleString("en-GB")})` : ""}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-1 px-4 pb-3 text-xs text-muted">
        <p>{p.availability}</p>
        {pick.nearbyStore ? (
          <p className="flex items-center gap-1 text-foreground">
            <MapPin className="h-3.5 w-3.5 text-accent" /> {pick.nearbyStore.name} · {km(pick.nearbyStore.distanceMeters)} <span className="text-muted">(store nearby · stock not confirmed)</span>
          </p>
        ) : null}
        {pick.verifiedOffer ? (
          <p className="text-success">Verified offer: {pick.verifiedOffer.title}{pick.verifiedOffer.code ? ` · code ${pick.verifiedOffer.code}` : ""}</p>
        ) : null}
        {pick.unverifiedOffer ? <p>Possible saving (unverified): {pick.unverifiedOffer.title}</p> : null}
        {pick.warnings.map((w) => (
          <p key={w} className="text-warn">⚠ {w}</p>
        ))}
        {pick.reasons.length && !compact ? <p>{pick.reasons.join(" · ")}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:grid-cols-4">
        <a href={p.productUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center justify-center gap-1 rounded-xl bg-accent px-3 text-sm font-semibold text-white">
          <ExternalLink className="h-4 w-4" /> Buy online
        </a>
        {onNearby ? (
          <Button variant="ghost" size="sm" className="h-11 rounded-xl" onClick={onNearby}>
            <MapPin className="h-4 w-4" /> Find nearby
          </Button>
        ) : null}
        {onAdd ? (
          <Button variant="secondary" size="sm" className="h-11 rounded-xl" onClick={onAdd} loading={adding}>
            <Plus className="h-4 w-4" /> Add to basket
          </Button>
        ) : null}
        {onBought ? (
          <Button variant="success" size="sm" className="h-11 rounded-xl" onClick={onBought}>
            <Check className="h-4 w-4" /> Mark bought
          </Button>
        ) : null}
      </div>
    </article>
  );
}
