"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { SectionTitle } from "@/components/ui/card";
import { CompareView } from "./compare-view";
import { BasketView } from "./basket-view";
import { OffersPanel } from "./offers-panel";
import { StoreConnectionsPanel } from "./store-connections-panel";
import { RETAILERS, type BasketItem } from "@/lib/types";
import type { BasketTotals, BudgetSummary } from "@/lib/budget/math";

const SUGGESTIONS = ["Duvet", "Towels", "Extension lead", "Frying pan", "Pillows", "Laundry basket", "Cutlery set"];

export function ShopClient({ basket, totals, budget }: { basket: BasketItem[]; totals: BasketTotals; budget: BudgetSummary }) {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [itemId, setItemId] = useState<string | undefined>(params.get("itemId") ?? undefined);
  const offers = params.get("offers");

  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== query) {
        setQuery(text.trim());
        setItemId(undefined);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [text, query]);

  const search = (q: string) => {
    setText(q);
    setQuery(q);
    setItemId(undefined);
  };

  return (
    <div className="px-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search(text.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search for an item, e.g. duvet" className="pl-9" aria-label="Search products" enterKeyHint="search" />
        </div>
        <Button type="submit">Search</Button>
      </form>
      <ChipRow className="pt-2">
        {SUGGESTIONS.map((s) => (
          <Chip key={s} active={query.toLowerCase() === s.toLowerCase()} onClick={() => search(s)}>{s}</Chip>
        ))}
      </ChipRow>

      <div className="pt-7">
        <StoreConnectionsPanel />
      </div>

      {offers ? (
        <>
          <SectionTitle>{offers === "student" ? "Student discounts" : "Vouchers & deals"}</SectionTitle>
          <OffersPanel retailer={offers !== "1" && offers !== "student" ? offers : undefined} studentOnly={offers === "student"} />
          {offers === "1" || offers === "student" ? (
            <ChipRow className="pt-2">
              {RETAILERS.map((r) => (
                <Chip key={r} onClick={() => router.push(`/shop?offers=${encodeURIComponent(r)}`)}>{r}</Chip>
              ))}
            </ChipRow>
          ) : null}
        </>
      ) : null}

      {query || itemId ? (
        <>
          <SectionTitle>{query ? `Results for “${query}”` : "Results"}</SectionTitle>
          <CompareView key={`${query}:${itemId ?? ""}`} query={query || undefined} itemId={itemId} onNearby={(retailer) => router.push(`/map?retailer=${encodeURIComponent(retailer)}&q=${encodeURIComponent(query)}`)} />
        </>
      ) : null}

      <SectionTitle>Basket</SectionTitle>
      <BasketView basket={basket} totals={totals} budget={budget} onSearch={search} />
      <div className="h-6" />
    </div>
  );
}
