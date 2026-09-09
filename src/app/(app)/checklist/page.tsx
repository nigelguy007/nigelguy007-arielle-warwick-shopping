import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/nav/page-header";
import { ChecklistClient } from "@/components/checklist/checklist-client";

export const metadata = { title: "Checklist" };

export default async function ChecklistPage() {
  const user = await requireUser();
  const d = await loadDashboard(user.id);
  return (
    <main>
      <PageHeader title="Checklist" subtitle={`${d.summary.stillNeeded} still needed · ${d.summary.packed} packed`} />
      <Suspense>
        <ChecklistClient initialItems={d.items} supplied={d.supplied.map((s) => s.id)} />
      </Suspense>
    </main>
  );
}
