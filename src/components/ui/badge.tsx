import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warn" | "danger" | "mock";
const tones: Record<Tone, string> = {
  neutral: "bg-black/5 text-foreground",
  accent: "bg-accent-soft text-accent-ink",
  success: "text-success",
  warn: "bg-warn-soft text-warn",
  danger: "text-danger",
  mock: "bg-mock-soft text-mock border border-mock/15",
};
const toneStyle: Partial<Record<Tone, React.CSSProperties>> = {
  success: { background: "color-mix(in oklch, var(--success) 16%, transparent)" },
  danger: { background: "color-mix(in oklch, var(--danger) 16%, transparent)" },
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5", tones[tone], className)} style={toneStyle[tone]}>
      {children}
    </span>
  );
}

export function MockBadge({ mock }: { mock: boolean }) {
  return mock ? <Badge tone="mock">Mock data · not live</Badge> : null;
}

/** "Essential" tag - the handoff's exact treatment (a soft warm badge, not
 * a pill) for a checklist item's priority. */
export function StampBadge({ tone = "accent", className, children }: { tone?: "accent" | "neutral"; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-extrabold tracking-[0.4px] uppercase", className)}
      style={tone === "accent" ? { background: "var(--essential-bg)", color: "var(--essential-fg)" } : { background: "rgba(0,0,0,0.05)", color: "var(--muted)" }}
    >
      {children}
    </span>
  );
}
