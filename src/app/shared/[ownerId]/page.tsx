import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { summarise, stillNeeded } from "@/lib/checklist/status";
import { calculateBasket, summariseBudget } from "@/lib/budget/math";
import { PageHeader } from "@/components/nav/page-header";
import { SharedView } from "@/components/share/shared-view";
import { Empty } from "@/components/ui/empty";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared view" };

export default async function SharedOwnerPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const user = await requireUser();
  const { ownerId } = await params;
  const store = await getStore();

  const isSelf = ownerId === user.id;
  let canViewChecklist = isSelf;
  let canViewBudget = isSelf;
  if (!isSelf) {
    const share = (await store.listSharedWithMe(user.id)).find((sh) => sh.ownerId === ownerId);
    if (!share) {
      return (
        <main className="mx-auto max-w-lg pb-10" style={{ paddingBottom: "var(--sab)" }}>
          <PageHeader title="Shared view" back="/me" />
          <div className="px-4">
            <Empty title="No access" body="You don't have access to this shared view. Ask them to send you a new invite link from their Me tab." />
          </div>
        </main>
      );
    }
    canViewChecklist = share.canViewChecklist;
    canViewBudget = share.canViewBudget;
  }

  const [owner, viewerProfile, items, budget, purchases, contributions] = await Promise.all([
    store.getProfile(ownerId),
    store.getProfile(user.id),
    canViewChecklist ? store.listUserChecklist(ownerId) : Promise.resolve([]),
    canViewBudget ? store.getBudget(ownerId) : Promise.resolve(null),
    canViewBudget ? store.listPurchases(ownerId) : Promise.resolve([]),
    canViewBudget ? store.listContributions(ownerId) : Promise.resolve([]),
  ]);

  const summary = canViewChecklist ? summarise(items) : null;
  const needed = canViewChecklist ? stillNeeded(items) : [];
  const budgetSummary = canViewBudget ? summariseBudget(budget, purchases, calculateBasket([])) : null;

  return (
    <main className="mx-auto max-w-lg pb-10" style={{ paddingBottom: "var(--sab)" }}>
      <PageHeader title={owner?.firstName ? `${owner.firstName}'s move-in` : "Shared move-in"} back={isSelf ? "/me" : undefined} subtitle={isSelf ? "Preview of the parent view" : "Read-only"} />
      <SharedView
        ownerId={ownerId}
        isSelf={isSelf}
        isLocalDemo={user.mode === "local"}
        canViewChecklist={canViewChecklist}
        canViewBudget={canViewBudget}
        summary={summary}
        needed={needed}
        budgetSummary={budgetSummary}
        contributions={contributions}
        contributorNameDefault={viewerProfile?.firstName ?? ""}
      />
    </main>
  );
}
