import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

const FACTS = [
  "Doesn't change any prices or stock info you see - that's not built yet",
  "No account, login or payment details needed from you",
  "You can remove it any time from Shop",
];

/**
 * Kept deliberately non-technical, per the brief: a fourteen-year-old should
 * be able to read this and know exactly what they're agreeing to. Since
 * connecting a retailer doesn't do anything live yet (see
 * store-connections-panel.tsx and api/stores/connect/route.ts), this sheet
 * must not claim a permission grant that doesn't exist - it just marks the
 * retailer as one the student is interested in.
 */
export function AuthorizeSheet({ open, retailer, onCancel, onAllow, connecting }: { open: boolean; retailer: string; onCancel: () => void; onAllow: () => void; connecting: boolean }) {
  return (
    <BottomSheet open={open} onClose={onCancel} label={`Connect ${retailer}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-[17px] font-extrabold text-accent-ink">{retailer.charAt(0).toUpperCase()}</div>
        <div>
          <div className="text-base font-extrabold">{retailer}</div>
          <div className="text-xs text-muted">Save {retailer} as a store you use</div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 py-1">
        {FACTS.map((p) => (
          <div key={p} className="flex items-start gap-2.5">
            <CheckIcon size={15} className="mt-0.5 shrink-0 text-accent" />
            <span className="text-[13px] leading-snug">{p}</span>
          </div>
        ))}
      </div>
      <div className="mt-0.5 flex gap-2.5">
        <Button variant="ghost" size="lg" className="flex-1" onClick={onCancel} disabled={connecting}>Not now</Button>
        <Button size="lg" className="flex-1" onClick={onAllow} loading={connecting}>Allow</Button>
      </div>
    </BottomSheet>
  );
}
