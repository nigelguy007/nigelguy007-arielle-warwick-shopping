import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import type { StoreMethod } from "@/lib/types";

const PERMISSIONS = [
  "See its product listings and current prices",
  "Check what's in stock near your campus",
  "Can't make purchases or see any payment details",
];

/**
 * Kept deliberately non-technical, per the brief: the method (API vs a
 * purpose-built connector) is a small caption, not the headline - a
 * fourteen-year-old should be able to read this and know exactly what
 * they're agreeing to.
 */
export function AuthorizeSheet({ open, retailer, method, onCancel, onAllow, connecting }: { open: boolean; retailer: string; method: StoreMethod; onCancel: () => void; onAllow: () => void; connecting: boolean }) {
  return (
    <BottomSheet open={open} onClose={onCancel} label={`Connect ${retailer}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-[17px] font-extrabold text-accent-ink">{retailer.charAt(0).toUpperCase()}</div>
        <div>
          <div className="text-base font-extrabold">{retailer}</div>
          <div className="text-xs text-muted">wants to share prices with Warwick Move-In</div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 py-1">
        {PERMISSIONS.map((p) => (
          <div key={p} className="flex items-start gap-2.5">
            <CheckIcon size={15} className="mt-0.5 shrink-0 text-accent" />
            <span className="text-[13px] leading-snug">{p}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted">{method === "API" ? `Uses ${retailer}'s official pricing service.` : `Uses a connector built for ${retailer}.`}</p>
      <div className="mt-0.5 flex gap-2.5">
        <Button variant="ghost" size="lg" className="flex-1" onClick={onCancel} disabled={connecting}>Not now</Button>
        <Button size="lg" className="flex-1" onClick={onAllow} loading={connecting}>Allow</Button>
      </div>
    </BottomSheet>
  );
}
