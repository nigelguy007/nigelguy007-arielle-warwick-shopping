import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/nav/page-header";
import { ShopClient } from "@/components/shop/shop-client";
import { gbp } from "@/lib/utils";

export const metadata = { title: "Shop" };

export default async function ShopPage() {
  const user = await requireUser();
  const d = await loadDashboard(user.id);
  return (
    <main>
      <PageHeader title="Shop" subtitle={d.basket.length ? `${d.basketTotals.retailerCount} shops · estimated ${gbp(d.basketTotals.estimatedTotal)}` : "Compare prices, then add to your basket"} />
      <Suspense>
        <ShopClient basket={d.basket} totals={d.basketTotals} budget={d.budgetSummary} />
      </Suspense>
    </main>
  );
}
