"use client";
import { api } from "@/lib/client/api";
import { useRequest } from "@/lib/client/use-request";
import { OfferCard } from "./offer-card";
import { SourceLine } from "@/components/ui/source-line";
import { Empty } from "@/components/ui/empty";
import type { OffersResponse } from "@/lib/providers/offer";

type Res = OffersResponse & { message: string | null };

export function OffersPanel({ retailer, studentOnly }: { retailer?: string; studentOnly?: boolean }) {
  const key = `offers:${retailer ?? ""}`;
  const { data, error, loading, refresh } = useRequest<Res>(key, ({ refresh: force }) => api<Res>(`/api/offers?${new URLSearchParams({ ...(retailer ? { retailer } : {}), ...(force ? { refresh: "1" } : {}) })}`));
  const offers = (data?.offers ?? []).filter((o) => (studentOnly ? o.type === "student" : true));
  return (
    <div className="space-y-3">
      {data ? <SourceLine provider={data.provider} checkedAt={data.checkedAt} mock={data.mock} onRefresh={refresh} refreshing={loading} /> : null}
      {loading && !data ? <div className="card h-24 animate-pulse bg-black/5" /> : null}
      {error ? <Empty title={error} /> : null}
      {data && offers.length === 0 ? <Empty title="I couldn't verify a current discount for this item." body={retailer ? "Try the retailer's own offers page or a student-discount site." : "Pick a retailer below to check its offers."} /> : null}
      {offers.map((o) => (
        <OfferCard key={o.id} offer={o} />
      ))}
      {data?.message && offers.length > 0 ? <p className="text-xs text-muted">{data.message}</p> : null}
    </div>
  );
}
