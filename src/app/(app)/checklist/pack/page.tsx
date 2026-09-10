import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/services/dashboard";
import { packableItems, packingProgress } from "@/lib/checklist/status";
import { PageHeader } from "@/components/nav/page-header";
import { PackingModeClient } from "@/components/checklist/packing-mode-client";

export const metadata = { title: "Packing mode" };

export default async function PackingModePage() {
  const user = await requireUser();
  const d = await loadDashboard(user.id);
  const items = packableItems(d.items);
  const progress = packingProgress(items);
  return (
    <main>
      <PageHeader title="Packing mode" back="/checklist" subtitle={`${progress.packed} of ${progress.total} packed`} />
      <Suspense>
        <PackingModeClient initialItems={items} />
      </Suspense>
    </main>
  );
}
