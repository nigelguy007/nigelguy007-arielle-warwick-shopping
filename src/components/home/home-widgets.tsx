import Link from "next/link";

/** 150x150 SVG progress ring - exact geometry from the design handoff
 * (r=62, stroke-width 11, rounded caps, rotated -90deg so it starts at 12
 * o'clock). Circumference = 2*pi*62 ≈ 389.6; the handoff's dasharray divides
 * that in a 194-total scale (half-circumference units) - kept identical so
 * the exact ratio math matches. */
export function ProgressRing({ done, total, centerLabel }: { done: number; total: number; centerLabel: string }) {
  const ratio = total > 0 ? done / total : 0;
  const dash = `${Math.round(ratio * 194) || (done > 0 ? 1 : 0)} 194`;
  return (
    <div className="relative h-[150px] w-[150px]">
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="62" fill="none" stroke="var(--ring-track)" strokeWidth="11" />
        <circle cx="75" cy="75" r="62" fill="none" stroke="var(--accent)" strokeWidth="11" strokeLinecap="round" strokeDasharray={dash} transform="rotate(-90 75 75)" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <div className="font-display text-[32px] leading-none font-extrabold">{done}</div>
        <div className="text-xs font-semibold text-foreground-secondary">{centerLabel}</div>
      </div>
    </div>
  );
}

/** The countdown banner: a gradient-tinted glass card, exact treatment from
 * the handoff. Right side shows real (not fabricated) alert counts - see
 * dashboard.ts's voucherExpiringCount comment for what's cheap to compute
 * synchronously vs what needs the alerts cron. */
export function CountdownBanner({ label, alertLines }: { label: string; alertLines: string[] }) {
  return (
    <div
      className="glass overflow-hidden rounded-[20px]"
      style={{ background: "linear-gradient(120deg, color-mix(in oklch, var(--accent) 20%, transparent), color-mix(in oklch, var(--accent) 5%, transparent))" }}
    >
      <div className="relative flex items-center justify-between px-[18px] py-3.5">
        <div>
          <div className="text-[11px] font-bold tracking-[1px] text-accent-ink uppercase">Move-in countdown</div>
          <div className="font-display text-[19px] font-extrabold">{label}</div>
        </div>
        {alertLines.length > 0 ? (
          <div className="text-right text-xs font-semibold text-foreground-secondary">
            {alertLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StatInline({ items }: { items: { label: string; value: string; href?: string }[] }) {
  return (
    <div className="tabular flex gap-[22px] text-[13px] text-foreground-secondary">
      {items.map((it) => {
        const content = (
          <>
            <b className="font-bold text-foreground">{it.value}</b> {it.label}
          </>
        );
        return it.href ? (
          <Link key={it.label} href={it.href} className="focus-visible:outline-2 focus-visible:outline-accent">
            {content}
          </Link>
        ) : (
          <span key={it.label}>{content}</span>
        );
      })}
    </div>
  );
}
