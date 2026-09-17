import Link from "next/link";
import { MapPin, Percent, GraduationCap, PackageOpen, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/services/dashboard";
import { CountdownBanner } from "@/components/home/home-widgets";
import { GlassIconButton } from "@/components/home/glass-icon-button";
import { BuyNextCard } from "@/components/home/buy-next-card";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { QuickFilterChips } from "@/components/home/quick-filter-chips";
import { ReadinessCard } from "@/components/home/readiness-card";
import { AccommodationCard } from "@/components/home/accommodation-card";
import { Icon, MISC_ICON_PATH } from "@/components/ui/icons";
import { providerStatus } from "@/lib/env";
import { countdownLabel } from "@/lib/checklist/countdown";
import { isWarwickUniversityName } from "@/lib/university-match";

function SectionHeader({ title, href, action = "See all" }: { title: string; href: string; action?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-[22px] font-extrabold tracking-tight">{title}</h2>
      <Link href={href} className="text-sm font-medium text-muted">{action}</Link>
    </div>
  );
}

export default async function HomePage() {
  const user = await requireUser();
  const d = await loadDashboard(user.id);
  const name = d.profile?.firstName || "there";
  const university = d.profile?.university || null;
  const status = providerStatus();
  const isWarwick = !university || isWarwickUniversityName(university);
  const moveIn = countdownLabel(d.profile?.moveInDate ?? null);
  const sortedCount = d.summary.total - d.summary.stillNeeded;
  const alertLines: string[] = [];
  if (d.voucherExpiringCount > 0) alertLines.push(`${d.voucherExpiringCount} voucher${d.voucherExpiringCount === 1 ? "" : "s"} expiring`);
  const categories = [...new Set(d.items.map((i) => i.category))].sort();

  return (
    <main className="flex flex-col gap-5 px-5" style={{ paddingTop: "calc(var(--sat) + 1.25rem)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] text-foreground-secondary">{university ? `Moving in at ${university}` : "Everything for your move-in"}</p>
          <h1 className="font-display mt-1 text-[32px] leading-none font-extrabold tracking-tight">Hey, {name}</h1>
        </div>
        <GlassIconButton href="/me?section=notifications" label="Notifications" badge={d.voucherExpiringCount || undefined} className="h-12 w-12 shrink-0 text-foreground" style={{ boxShadow: "var(--card-shadow)" }}>
          <Icon path={MISC_ICON_PATH.bell} size={20} sw={1.8} />
        </GlassIconButton>
      </div>

      <HomeSearchBar />
      {categories.length > 0 ? <QuickFilterChips categories={categories} /> : null}

      {moveIn ? <CountdownBanner label={moveIn} alertLines={alertLines} /> : (
        <Link href="/me" className="card flex items-center justify-between px-[18px] py-3.5 text-sm font-semibold text-accent-ink">
          Set your move-in date <span>→</span>
        </Link>
      )}

      <ReadinessCard sorted={sortedCount} total={d.summary.total} budgetRemaining={d.budgetSummary.remaining} toBuy={d.summary.total - sortedCount} packed={d.summary.packed} />

      {status.mockVisible ? (
        <p className="flex items-start gap-2 rounded-2xl bg-accent-soft px-4 py-2 text-xs text-accent-ink">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Development mode: prices, shops and offers are mock data, not live.
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionHeader title="Buy next" href="/checklist?filter=needed" />
        {d.buyNext.length === 0 ? (
          <div className="card p-4 text-sm text-foreground-secondary">Nothing left to buy before you go. 🎉</div>
        ) : (
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {d.buyNext.map((c) => (
              <BuyNextCard key={c.item.id} candidate={c} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Your accommodation" href="/me" action="Details" />
        <AccommodationCard accommodation={d.accommodation} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-extrabold tracking-tight">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/map" className="card flex items-center gap-2.5 p-4 text-sm font-semibold"><MapPin className="h-[18px] w-[18px] text-accent" /> Find near me</Link>
          <Link href="/shop?offers=1" className="card flex items-center gap-2.5 p-4 text-sm font-semibold"><Percent className="h-[18px] w-[18px] text-accent" /> Best deals</Link>
          <Link href="/shop?offers=student" className="card flex items-center gap-2.5 p-4 text-sm font-semibold"><GraduationCap className="h-[18px] w-[18px] text-accent" /> Student discounts</Link>
          <Link href="/checklist?filter=unpacked" className="card flex items-center gap-2.5 p-4 text-sm font-semibold"><PackageOpen className="h-[18px] w-[18px] text-accent" /> Not packed</Link>
        </div>
      </section>

      {isWarwick ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[22px] font-extrabold tracking-tight">Warwick already provides</h2>
          <div className="card p-4 text-sm">
            {!d.accommodation ? (
              <p className="text-foreground-secondary">Tell me your Warwick accommodation and I&apos;ll show what&apos;s already in your room and kitchen. <Link href="/me" className="font-semibold text-accent-ink">Set accommodation</Link></p>
            ) : !d.accommodation.verifiedAt ? (
              <p className="text-foreground-secondary">{d.accommodation.name}: details not verified yet. Check the <a className="font-semibold text-accent-ink" href={d.accommodation.officialUrl} target="_blank" rel="noopener noreferrer">official Warwick page</a> before buying bedding, pans or appliances.</p>
            ) : d.accommodation.suppliedAppliances.length === 0 ? (
              <p className="text-foreground-secondary">No supplied items recorded for {d.accommodation.name}.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {d.accommodation.suppliedAppliances.map((a) => (
                  <li key={a} className="rounded-full bg-accent-soft px-3 py-1 font-medium text-accent-ink">{a}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
      <div className="h-6" />
    </main>
  );
}
