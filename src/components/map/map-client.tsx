"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon, Route } from "lucide-react";
import { api } from "@/lib/client/api";
import { locationParams, useLocationContext } from "@/lib/client/location";
import { useRequest } from "@/lib/client/use-request";
import { LocationPicker } from "./location-picker";
import { StoreCard } from "./store-card";
import { GoogleMap } from "./google-map";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { SourceLine } from "@/components/ui/source-line";
import { STORE_CATEGORY_LABELS, googleMapsDirectionsUrl, type StoreCategory } from "@/lib/providers/map/types";
import type { NearbyStoresResponse } from "@/lib/providers/map";
import { RETAILERS } from "@/lib/types";

export function MapClient({ mapsBrowserKey, basketRetailers }: { mapsBrowserKey: string | null; basketRetailers: string[] }) {
  const params = useSearchParams();
  const loc = useLocationContext();
  const [category, setCategory] = useState<StoreCategory | null>(null);
  const [retailer, setRetailer] = useState<string | null>(params.get("retailer"));
  const [view, setView] = useState<"list" | "map">(mapsBrowserKey ? "map" : "list");
  const [selected, setSelected] = useState<string | null>(null);
  const itemQuery = params.get("q") ?? "";
  const locParams = locationParams(loc.location);
  const key = loc.location?.coords ? `stores:${JSON.stringify(locParams)}:${category ?? ""}:${retailer ?? ""}` : null;
  const { data, error, loading, refresh } = useRequest<NearbyStoresResponse>(key, ({ refresh: force }) =>
    api<NearbyStoresResponse>(`/api/stores/nearby?${new URLSearchParams({ ...locParams, ...(category ? { categories: category } : {}), ...(retailer ? { retailer } : {}), ...(force ? { refresh: "1" } : {}) })}`),
  );

  const stores = useMemo(() => data?.stores ?? [], [data]);
  const center = useMemo(() => loc.location?.coords ?? { lat: 52.3793, lng: -1.5615 }, [loc.location]);
  const tripStores = useMemo(() => {
    const keys = new Set(basketRetailers.map((r) => r.toLowerCase()));
    const seen = new Set<string>();
    return stores.filter((s) => {
      const k = (s.retailerKey ?? "").toLowerCase();
      if (!keys.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [stores, basketRetailers]);

  return (
    <div className="space-y-3 px-4">
      <div className="card p-4">
        <LocationPicker ctx={loc} />
      </div>
      <ChipRow>
        <Chip active={!category && !retailer} onClick={() => { setCategory(null); setRetailer(null); }}>All shops</Chip>
        {(Object.keys(STORE_CATEGORY_LABELS) as StoreCategory[]).map((c) => (
          <Chip key={c} active={category === c} onClick={() => { setCategory(category === c ? null : c); setRetailer(null); }}>{STORE_CATEGORY_LABELS[c]}</Chip>
        ))}
      </ChipRow>
      <ChipRow>
        {RETAILERS.map((r) => (
          <Chip key={r} active={retailer === r} onClick={() => { setRetailer(retailer === r ? null : r); setCategory(null); }} className="text-xs">{r}</Chip>
        ))}
      </ChipRow>

      {!loc.location?.coords ? <Empty title="Share your location or enter a postcode to see nearby shops." /> : null}
      {error ? <Empty title={error} /> : null}
      {data ? (
        <div className="flex items-center justify-between gap-2">
          <SourceLine provider={data.provider} checkedAt={data.checkedAt} mock={data.mock} onRefresh={refresh} refreshing={loading} />
          {mapsBrowserKey ? (
            <div className="flex rounded-full border border-border p-0.5" role="tablist">
              <button type="button" role="tab" aria-selected={view === "map"} onClick={() => setView("map")} className={`tap rounded-full px-3 text-xs font-semibold ${view === "map" ? "bg-foreground text-white" : ""}`}><MapIcon className="inline h-4 w-4" /></button>
              <button type="button" role="tab" aria-selected={view === "list"} onClick={() => setView("list")} className={`tap rounded-full px-3 text-xs font-semibold ${view === "list" ? "bg-foreground text-white" : ""}`}><List className="inline h-4 w-4" /></button>
            </div>
          ) : null}
        </div>
      ) : null}
      {itemQuery ? <p className="text-sm text-muted">Looking for: <span className="font-medium text-foreground">{itemQuery}</span>. Shops below may sell it, but stock isn&apos;t confirmed.</p> : null}
      {view === "map" && mapsBrowserKey && loc.location?.coords ? <GoogleMap apiKey={mapsBrowserKey} center={center} stores={stores} selectedId={selected} onSelect={setSelected} /> : null}
      {!mapsBrowserKey && data ? <p className="text-xs text-muted">Map preview needs a Google Maps browser key. Use “Open in Maps” on any shop.</p> : null}

      {tripStores.length > 1 ? (
        <a href={googleMapsDirectionsUrl(tripStores.map((s) => s.location), loc.location?.coords)} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="secondary" className="w-full"><Route className="h-4 w-4" /> Build a shopping trip ({tripStores.length} basket shops)</Button>
        </a>
      ) : null}

      {data && stores.length === 0 ? <Empty title="No shops found for that filter nearby." /> : null}
      {(view === "list" || !mapsBrowserKey ? stores : selected ? stores.filter((s) => s.id === selected) : stores.slice(0, 5)).map((s) => (
        <StoreCard key={s.id} store={s} itemQuery={itemQuery} selected={selected === s.id} onSelect={() => setSelected(s.id)} />
      ))}
      <div className="h-6" />
    </div>
  );
}
