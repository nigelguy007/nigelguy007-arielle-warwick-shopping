import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { PageHeader } from "@/components/nav/page-header";
import { SectionTitle } from "@/components/ui/card";
import { Badge, StampBadge } from "@/components/ui/badge";
import { StatusActions } from "@/components/checklist/status-actions";
import { CompareView } from "@/components/shop/compare-view";
import { STATUS_LABELS, TIMING_LABELS } from "@/lib/types";
import { accommodationWarningFor, isSuppliedByHall } from "@/lib/ranking/compatibility";
import { gbp } from "@/lib/utils";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const store = await getStore();
  const item = await store.getUserChecklistItem(user.id, id);
  if (!item) notFound();
  const profile = await store.getProfile(user.id);
  const accommodation = profile?.accommodationSlug ? await store.getAccommodation(profile.accommodationSlug) : null;
  const supplied = isSuppliedByHall(item, accommodation);
  const warning = accommodationWarningFor(item, accommodation);
  const sourceable = !supplied && item.status !== "have" && item.status !== "bought" && item.status !== "packed" && item.status !== "do_not_buy";

  return (
    <main className="px-4">
      <PageHeader title="" back="/checklist" />
      <div className="photo-placeholder h-[190px] rounded-[1.375rem] border border-border">
        <span className="photo-label text-xs">product photo — retailer feed</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge>{item.category}</Badge>
        {item.priority === "essential" ? <StampBadge>Essential</StampBadge> : null}
      </div>
      <h1 className="font-display mt-2 text-[23px] font-extrabold tracking-tight">{item.item}</h1>
      <p className="mt-0.5 text-[13px] text-foreground-secondary">
        {TIMING_LABELS[item.timing]} · Qty {item.qty}{item.budgetEstimate !== null ? ` · Est. ${gbp(item.budgetEstimate)}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.priority !== "essential" ? <Badge>{item.priority}</Badge> : null}
        {supplied ? <Badge tone="success">Warwick already provides this</Badge> : null}
      </div>
      {item.notes ? <p className="pt-3 text-sm text-muted">{item.notes}</p> : null}

      <SectionTitle>Status · {STATUS_LABELS[item.status]}</SectionTitle>
      <StatusActions itemId={item.id} status={item.status} />

      {supplied ? (
        <div className="card mt-4 bg-success-soft p-4 text-sm text-success">Warwick already provides this in {accommodation?.name}. No need to buy it.</div>
      ) : sourceable ? (
        <>
          <SectionTitle action={<Link href={`/shop?itemId=${item.id}&q=${encodeURIComponent(item.item)}`} className="text-sm font-semibold text-accent-ink">Open in Shop</Link>}>Where to buy</SectionTitle>
          {warning && !warning.startsWith("Induction") ? <p className="mb-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">{warning}</p> : null}
          <CompareView itemId={item.id} university={profile?.university ?? null} />
        </>
      ) : (
        <p className="pt-4 text-sm text-muted">Marked as {STATUS_LABELS[item.status].toLowerCase()}, so there is nothing to buy.</p>
      )}
      <div className="h-6" />
    </main>
  );
}
