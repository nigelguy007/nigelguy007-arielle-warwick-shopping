import Link from "next/link";
import { MapPin, Percent, GraduationCap, PackageOpen, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/services/dashboard";
import { TicketHero, StatRow } from "@/components/home/stat-card";
import { BuyNextCard } from "@/components/home/buy-next-card";
import { SectionTitle } from "@/components/ui/card";
import { gbp } from "@/lib/utils";
import { providerStatus } from "@/lib/env";

export default async function HomePage() {
  const user = await requireUser();
  const d = await loadDashboard(user.id);
  const name = d.profile?.firstName || "there";
  const status = providerStatus();

  return (
    <main className="px-4" style={{ paddingTop: "calc(var(--sat) + 1rem)" }}>
      <TicketHero
        name={name}
        place={d.accommodation ? `Warwick move-in - ${d.accommodation.name}` : "Warwick move-in"}
        left={{ label: "Still needed", value: `${d.summary.stillNeeded}`, href: "/checklist?filter=needed" }}
        right={{
          label: "Budget left",
          value: d.budgetSummary.remaining === null ? "Set budget" : gbp(d.budgetSummary.remaining),
          sub: d.budgetSummary.budget !== null ? `of ${gbp(d.budgetSummary.budget)}, spent ${gbp(d.budgetSummary.spent)}` : undefined,
          href: "/me",
        }}
      />
      <StatRow
        items={[
          { label: "Bought", value: `${d.summary.essentialsDone}/${d.summary.essentialsTotal}`, href: "/checklist?filter=bought" },
          { label: "Packed", value: `${d.summary.packed}`, href: "/checklist?filter=packed" },
        ]}
      />

      {status.mockVisible ? (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-mock-soft px-4 py-2 text-xs text-mock">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Development mode: prices, shops and offers are mock data, not live.
        </p>
      ) : null}

      <SectionTitle action={<Link href="/checklist" className="text-sm font-semibold text-accent-ink">All items</Link>}>Buy next</SectionTitle>
      {d.buyNext.length === 0 ? (
        <div className="card p-4 text-sm text-muted">Nothing left to buy before you go. 🎉</div>
      ) : (
        <div className="space-y-5">
          {d.buyNext.map((c) => (
            <BuyNextCard key={c.item.id} candidate={c} />
          ))}
        </div>
      )}

      <SectionTitle>Quick actions</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/map" className="card flex items-center gap-3 p-4 font-semibold"><MapPin className="h-5 w-5 text-accent" /> Find near me</Link>
        <Link href="/shop?offers=1" className="card flex items-center gap-3 p-4 font-semibold"><Percent className="h-5 w-5 text-accent" /> Best deals</Link>
        <Link href="/shop?offers=student" className="card flex items-center gap-3 p-4 font-semibold"><GraduationCap className="h-5 w-5 text-accent" /> Student discounts</Link>
        <Link href="/checklist?filter=unpacked" className="card flex items-center gap-3 p-4 font-semibold"><PackageOpen className="h-5 w-5 text-accent" /> What haven&apos;t I packed?</Link>
      </div>

      <SectionTitle>Warwick already provides</SectionTitle>
      <div className="card p-4 text-sm">
        {!d.accommodation ? (
          <p className="text-muted">Tell me your Warwick accommodation and I&apos;ll show what&apos;s already in your room and kitchen. <Link href="/me" className="font-semibold text-accent-ink">Set accommodation</Link></p>
        ) : !d.accommodation.verifiedAt ? (
          <p className="text-muted">{d.accommodation.name}: details not verified yet. Check the <a className="font-semibold text-accent-ink" href={d.accommodation.officialUrl} target="_blank" rel="noopener noreferrer">official Warwick page</a> before buying bedding, pans or appliances.</p>
        ) : d.accommodation.suppliedAppliances.length === 0 ? (
          <p className="text-muted">No supplied items recorded for {d.accommodation.name}.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {d.accommodation.suppliedAppliances.map((a) => (
              <li key={a} className="rounded-full bg-success-soft px-3 py-1 font-medium text-success">{a}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="h-6" />
    </main>
  );
}
