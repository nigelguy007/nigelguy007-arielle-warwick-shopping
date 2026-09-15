import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { PageHeader } from "@/components/nav/page-header";
import { MapClient } from "@/components/map/map-client";

export const metadata = { title: "Map" };

export default async function MapPage() {
  const user = await requireUser();
  const store = await getStore();
  const [basket, profile] = await Promise.all([store.listBasket(user.id), store.getProfile(user.id)]);
  const retailers = [...new Set(basket.map((b) => b.productSnapshot.retailer))];
  return (
    <main>
      <PageHeader title="Map" subtitle="Shops near you. Store hours only, never stock." />
      <Suspense>
        <MapClient mapsBrowserKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null} basketRetailers={retailers} university={profile?.university ?? null} />
      </Suspense>
    </main>
  );
}
