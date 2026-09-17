import Link from "next/link";
import type { AccommodationProfile } from "@/lib/types";

const HOB_LABEL: Record<string, string> = { induction: "Induction hob", ceramic: "Ceramic hob", electric_coil: "Electric hob", gas: "Gas hob" };

/** Home's single real accommodation summary in the reference's photo-card
 * treatment. There's no photo field on AccommodationProfile, so the image
 * area is the sage gradient placeholder rather than fabricated imagery. */
export function AccommodationCard({ accommodation }: { accommodation: AccommodationProfile | null }) {
  if (!accommodation) {
    return (
      <Link href="/me" className="card flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-accent-ink">
        Set your accommodation <span>→</span>
      </Link>
    );
  }

  const details = [
    accommodation.ensuite === true ? "En-suite" : accommodation.sharedBathroom ? "Shared bathroom" : null,
    accommodation.hobType && accommodation.hobType !== "unknown" ? HOB_LABEL[accommodation.hobType] ?? accommodation.hobType : null,
  ].filter(Boolean);

  return (
    <Link href="/me" className="photo-placeholder relative block h-[150px] overflow-hidden rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)" }} />
      {accommodation.verifiedAt ? <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#121212]">Verified</span> : null}
      <div className="absolute right-4 bottom-3.5 left-4 text-white">
        <p className="truncate text-[17px] leading-tight font-bold">{accommodation.name}</p>
        {details.length > 0 ? <p className="mt-0.5 truncate text-xs text-white/85">{details.join(" · ")}</p> : null}
      </div>
    </Link>
  );
}
