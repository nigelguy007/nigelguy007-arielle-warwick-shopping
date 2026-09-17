import Link from "next/link";
import { MapPin, Percent, GraduationCap, PackageOpen, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/services/dashboard";
import { CountdownBanner } from "@/components/home/home-widgets";
import { DarkToggleButton } from "@/components/home/dark-toggle-button";
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

export default async function HomePage() {
  const user = await requireUser();
  const d = await loadDashboard(user.id);
  const name = d.profile?.firstName || "there";
  const university = d.profile?.university || null;
  const status = providerStatus();
  const isWarwick = !university || isWarwickUniversityName(university);
  const hallLabel = d.accommodation ? `${d.accommodation.name}` : university || "Move-in";
  const moveIn = countdownLabel(d.profile?.moveInDate ?? null);
  const sortedCount = d.summary.total - d.summary.stillNeeded;
  const alertLines: string[] = [];
  if (d.voucherExpiringCount > 0) alertLines.push(`${d.voucherExpiringCount} voucher${d.voucherExpiringCount === 1 ? "" : "s"} expiring`);
  const categories = [...new Set(d.items.map((i) => i.category))].sort();

  return (
    <main className="flex flex-col gap-4 px-5" style={{ paddingTop: "calc(var(--sat) + 1.25rem)" }}>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-foreground-secondary">{hallLabel}</div>
        <div className="flex gap-2">
          <DarkToggleButton />
          <GlassIconButton href="/me?section=notifications" label="Notifications">
            <Icon path={MISC_ICON_PATH.bell} size={17} sw={1.8} />
          </GlassIconButton>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <h1 className="font-display text-[28px] leading-none font-extrabold tracking-[-0.5px]">Hi {name}</h1>
        {university ? <p className="text-sm text-foreground-secondary">{university}</p> : null}
      </div>

      <HomeSearchBar />
      {categories.length > 0 ? <QuickFilterChips categories={categories} /> : null}

      {moveIn ? <CountdownBanner label={moveIn} alertLines={alertLines} /> : (
        <Link href="/me" className="glass-card flex items-center justify-between px-[18px] py-3.5 text-sm font-semibold text-accent-ink">
          Set your move-in date <span>→</span>
        </Link>
      )}

      <ReadinessCard sorted={sortedCount} total={d.summary.total} budgetRemaining={d.budgetSummary.remaining} toBuy={d.summary.total - sortedCount} packed={d.summary.packed} />

      {status.mockVisible ? (
        <p className="flex items-start gap-2 rounded-2xl bg-accent-soft px-4 py-2 text-xs text-accent-ink">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Development mode: prices, shops and offers are mock data, not live.
        </p>
      ) : null}

      <div className="flex items-baseline justify-between">
        <div className="font-display text-xl font-extrabold">Your accommodation</div>
        <Link href="/me" className="text-sm font-bold text-accent-ink">Details</Link>
      </div>
      <AccommodationCard accommodation={d.accommodation} />

      <div className="flex items-baseline justify-between">
        <div className="font-display text-xl font-extrabold">Buy next</div>
        <Link href="/checklist" className="text-sm font-bold text-accent-ink">All items</Link>
      </div>
      {d.buyNext.length === 0 ? (
        <div className="glass-card p-4 text-sm text-foreground-secondary">Nothing left to buy before you go. 🎉</div>
      ) : (
        <div className="no-scrollbar -mr-5 flex gap-3 overflow-x-auto pb-1">
          {d.buyNext.map((c) => (
            <BuyNextCard key={c.item.id} candidate={c} />
          ))}
        </div>
      )}

      <div className="font-display pt-1 text-xl font-extrabold">Quick actions</div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/map" className="glass-card flex items-center gap-2.5 p-3.5 text-sm font-semibold"><MapPin className="h-4.5 w-4.5 text-accent" /> Find near me</Link>
        <Link href="/shop?offers=1" className="glass-card flex items-center gap-2.5 p-3.5 text-sm font-semibold"><Percent className="h-4.5 w-4.5 text-accent" /> Best deals</Link>
        <Link href="/shop?offers=student" className="glass-card flex items-center gap-2.5 p-3.5 text-sm font-semibold"><GraduationCap className="h-4.5 w-4.5 text-accent" /> Student discounts</Link>
        <Link href="/checklist?filter=unpacked" className="glass-card flex items-center gap-2.5 p-3.5 text-sm font-semibold"><PackageOpen className="h-4.5 w-4.5 text-accent" /> Not packed</Link>
      </div>

      {isWarwick ? (
        <>
          <div className="font-display pt-1 text-xl font-extrabold">Warwick already provides</div>
          <div className="glass-card p-4 text-sm">
            {!d.accommodation ? (
              <p className="text-foreground-secondary">Tell me your Warwick accommodation and I&apos;ll show what&apos;s already in your room and kitchen. <Link href="/me" className="font-semibold text-accent-ink">Set accommodation</Link></p>
            ) : !d.accommodation.verifiedAt ? (
              <p className="text-foreground-secondary">{d.accommodation.name}: details not verified yet. Check the <a className="font-semibold text-accent-ink" href={d.accommodation.officialUrl} target="_blank" rel="noopener noreferrer">official Warwick page</a> before buying bedding, pans or appliances.</p>
            ) : d.accommodation.suppliedAppliances.length === 0 ? (
              <p className="text-foreground-secondary">No supplied items recorded for {d.accommodation.name}.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {d.accommodation.suppliedAppliances.map((a) => (
                  <li key={a} className="rounded-full px-3 py-1 font-medium text-success" style={{ background: "color-mix(in oklch, var(--success) 16%, transparent)" }}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
      <div className="h-6" />
    </main>
  );
}
