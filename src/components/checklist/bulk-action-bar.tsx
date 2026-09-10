import { Icon, CHECKLIST_STATUS_ICON } from "@/components/ui/icons";

/** Replaces the tab bar while Checklist is in multi-select mode - exact
 * treatment and icon paths from the design handoff. */
export function BulkActionBar({ onBought, onPacked, onSkip }: { onBought: () => void; onPacked: () => void; onSkip: () => void }) {
  return (
    <div className="glass h-16 rounded-[22px]" style={{ boxShadow: "var(--bar-shadow)" }}>
      <div className="flex h-full items-center justify-around px-2.5">
        <button type="button" onClick={onBought} className="flex flex-col items-center gap-0.5">
          <Icon path={CHECKLIST_STATUS_ICON.check} size={18} sw={2.6} className="text-success" />
          <span className="text-[11px] font-bold text-success">Bought</span>
        </button>
        <button type="button" onClick={onPacked} className="flex flex-col items-center gap-0.5">
          <Icon path={CHECKLIST_STATUS_ICON.packed} size={18} sw={1.9} className="text-accent-ink" />
          <span className="text-[11px] font-bold text-accent-ink">Packed</span>
        </button>
        <button type="button" onClick={onSkip} className="flex flex-col items-center gap-0.5">
          <Icon path={CHECKLIST_STATUS_ICON.skip} size={18} sw={1.9} className="text-danger" />
          <span className="text-[11px] font-bold text-danger">Skip</span>
        </button>
      </div>
    </div>
  );
}
