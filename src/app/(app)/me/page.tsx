import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { loadDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/nav/page-header";
import { MeClient } from "@/components/me/me-client";
import { providerStatus, env } from "@/lib/env";

export const metadata = { title: "Me" };

export default async function MePage() {
  const user = await requireUser();
  const store = await getStore();
  const [d, accommodations, invites, shares, sharedWithMe] = await Promise.all([
    loadDashboard(user.id),
    store.listAccommodations(),
    store.listInvites(user.id),
    store.listShares(user.id),
    store.listSharedWithMe(user.id),
  ]);
  return (
    <main>
      <PageHeader title="Me" subtitle="Budget, accommodation and settings" />
      <MeClient profile={d.profile!} accommodations={accommodations} budget={d.budgetSummary} purchases={d.purchases} mode={user.mode} email={user.email} providers={providerStatus()} invites={invites} shares={shares} sharedWithMe={sharedWithMe} appUrl={env.appUrl} />
    </main>
  );
}
