import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warn" | "mock";
const tones: Record<Tone, string> = {
  neutral: "bg-black/5 text-foreground",
  accent: "bg-accent-soft text-accent-ink",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  mock: "bg-violet-100 text-violet-800 border border-violet-200",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5", tones[tone], className)}>{children}</span>;
}

export function MockBadge({ mock }: { mock: boolean }) {
  return mock ? <Badge tone="mock">Mock data · not live</Badge> : null;
}
