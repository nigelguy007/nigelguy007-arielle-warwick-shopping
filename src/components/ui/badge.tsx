import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warn" | "danger" | "mock";
const tones: Record<Tone, string> = {
  neutral: "bg-black/5 text-foreground",
  accent: "bg-accent-soft text-accent-ink",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  mock: "bg-mock-soft text-mock border border-mock/15",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5", tones[tone], className)}>{children}</span>;
}

export function MockBadge({ mock }: { mock: boolean }) {
  return mock ? <Badge tone="mock">Mock data · not live</Badge> : null;
}

/** Corner-notched packing-sticker treatment for a checklist item's priority,
 * e.g. "essential" - stands apart from the pill badges used for status/mock
 * tags rather than sharing their shape. */
export function StampBadge({ tone = "accent", className, children }: { tone?: "accent" | "neutral"; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("tag-stamp", tone === "neutral" && "bg-black/5 text-muted", className)} style={tone === "accent" ? undefined : { background: "none" }}>
      {children}
    </span>
  );
}
