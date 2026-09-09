import { ExternalLink, GraduationCap, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { describeExpiry } from "@/lib/offers/expiry";
import type { OfferResult } from "@/lib/types";

export function OfferCard({ offer }: { offer: OfferResult }) {
  const student = offer.type === "student";
  return (
    <article className="card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-accent-soft p-2 text-accent-ink">{student ? <GraduationCap className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={offer.verified ? "success" : "warn"}>{offer.verified ? "Verified" : "Unverified"}</Badge>
            {offer.provider === "mock" ? <Badge tone="mock">Mock</Badge> : null}
            {offer.studentVerificationRequired ? <Badge>Student verification needed</Badge> : null}
          </div>
          <h3 className="mt-1 font-semibold">{offer.title}</h3>
          <p className="text-sm text-muted">{offer.retailer}{offer.code ? ` · code ${offer.code}` : ""}</p>
          <p className="mt-1 text-xs text-muted">{describeExpiry(offer)}{offer.endDate ? ` (${new Date(offer.endDate).toLocaleDateString("en-GB")})` : ""} · Source: {offer.source}</p>
          <p className="mt-1 text-xs text-muted">{offer.terms}</p>
        </div>
      </div>
      <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="tap mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink">
        {student && !offer.verified ? "Check student discount" : "Open offer"} <ExternalLink className="h-4 w-4" />
      </a>
    </article>
  );
}

/** One compact card for unverified student-discount deep links, grouped by retailer. */
export function StudentLinks({ offers }: { offers: OfferResult[] }) {
  const links = offers.filter((o) => o.type === "student" && !o.verified);
  if (links.length === 0) return null;
  const byRetailer = new Map<string, OfferResult[]>();
  for (const l of links) byRetailer.set(l.retailer, [...(byRetailer.get(l.retailer) ?? []), l]);
  return (
    <article className="card p-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-accent-ink" />
        <h3 className="font-semibold">Check student discount</h3>
        <Badge tone="warn">Unverified</Badge>
      </div>
      <p className="mt-1 text-xs text-muted">Student status must be verified with the provider. This app never confirms a student discount exists.</p>
      <ul className="mt-2 space-y-1 text-sm">
        {[...byRetailer.entries()].map(([retailer, list]) => (
          <li key={retailer} className="flex flex-wrap items-center gap-x-2">
            <span className="font-medium">{retailer}:</span>
            {list.map((l) => (
              <a key={l.id} href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center gap-0.5 text-accent-ink font-semibold">
                {l.source.replace(" (public search)", "")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
          </li>
        ))}
      </ul>
    </article>
  );
}
