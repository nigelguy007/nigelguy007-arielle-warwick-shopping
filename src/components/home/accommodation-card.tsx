import Link from "next/link";
import type { AccommodationProfile } from "@/lib/types";

const HOB_LABEL: Record<string, string> = { induction: "Induction hob", electric: "Electric hob", gas: "Gas hob" };

/** Home's single real accommodation summary - no stock photo (there's no
 * photo field on AccommodationProfile), so this uses the same
 * photo-placeholder stripe convention as product cards rather than
 * fabricating imagery. */
export function AccommodationCard({ accommodation }: { accommodation: AccommodationProfile | null }) {
  if (!accommodation) {
    return (
      <Link href="/me" className="glass-card flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-accent-ink">
        Set your accommodation <span>→</span>
      </Link>
    );
  }

  const details = [
    accommodation.ensuite === true ? "En-suite" : accommodation.sharedBathroom ? "Shared bathroom" : null,
    accommodation.hobType ? HOB_LABEL[accommodation.hobType] ?? accommodation.hobType : null,
  ].filter(Boolean);

  return (
    <Link href="/me" className="glass-card block overflow-hidden">
      <div className="photo-placeholder h-20">
        <span className="text-[9px]">photo</span>
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold">{accommodation.name}</p>
            {accommodation.verifiedAt ? <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-ink">Verified</span> : null}
          </div>
          {details.length > 0 ? <p className="text-xs text-foreground-secondary">{details.join(" · ")}</p> : null}
        </div>
        <span className="shrink-0 text-xs font-semibold text-accent-ink">Details</span>
      </div>
    </Link>
  );
}
