import { Suspense } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
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
      <PageHeader
        title="Checklist"
        subtitle={`${d.summary.stillNeeded} still needed · ${d.summary.packed} packed`}
        right={
          <Link href="/checklist/pack" className="tap flex items-center gap-1 rounded-full bg-accent-soft px-3 py-2 text-xs font-semibold text-accent-ink">
            <Package className="h-4 w-4" /> Packing mode
          </Link>
        }
      />
      <Suspense>
        <ChecklistClient initialItems={d.items} supplied={d.supplied.map((s) => s.id)} />
      </Suspense>
    </main>
  );
}
