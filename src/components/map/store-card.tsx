import { ExternalLink, Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { km } from "@/lib/utils";
import type { StoreResult } from "@/lib/types";

export function retailerSearchUrl(retailer: string, query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${retailer} ${query}`)}`;
}

/**
 * One row inside the Map screen's shop-list sheet (see map-client.tsx) -
 * a numbered badge that correlates with the matching map pin, name/meta,
 * and the two action links. Deliberately not its own glass-card: the
 * divide-y rows sit inside one shared glass-card sheet, mirroring
 * store-connections-panel's row treatment.
 */
export function StoreCard({ store, itemQuery, onSelect, selected, index }: { store: StoreResult; itemQuery?: string; onSelect?: () => void; selected?: boolean; index?: number }) {
  return (
    <div className={`flex gap-3 p-4 ${selected ? "bg-accent-soft" : ""}`} onClick={onSelect}>
      {typeof index === "number" ? (
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-extrabold text-accent-ink">{index + 1}</div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold leading-snug">{store.name}</h3>
            <p className="text-xs text-muted">{store.address}</p>
          </div>
          <div className="shrink-0 text-right text-xs">
            <p className="font-bold text-foreground">{km(store.distanceMeters)}</p>
            {store.travelTimeMinutes !== null ? <p className="text-muted">~{store.travelTimeMinutes} min drive</p> : null}
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          {store.openNow === null ? <Badge>Hours not available</Badge> : store.openNow ? <Badge tone="success">Open now</Badge> : <Badge tone="warn">Closed now</Badge>}
          {typeof store.rating === "number" ? (
            <span className="inline-flex items-center gap-1 text-muted">
              <Star className="h-3.5 w-3.5 fill-current text-warn" /> {store.rating.toFixed(1)}
            </span>
          ) : null}
          {store.provider === "mock" ? <Badge tone="mock">Mock</Badge> : null}
        </div>
        <p className="mt-2 text-[11px] text-muted">Store location and hours only. This does not confirm the item is in stock here.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center justify-center gap-1 rounded-xl bg-accent px-3 text-sm font-semibold text-on-accent" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-4 w-4" /> Open in Maps
          </a>
          <a href={retailerSearchUrl(store.retailerKey ?? store.name, itemQuery ?? "")} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center justify-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold" onClick={(e) => e.stopPropagation()}>
            <Search className="h-4 w-4" /> Retailer search
          </a>
        </div>
      </div>
    </div>
  );
}
