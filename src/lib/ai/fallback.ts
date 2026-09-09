import "server-only";
import { loadDashboard, findItemByName } from "@/lib/services/dashboard";
import { compareProducts } from "@/lib/services/compare";
import { nearbyStores } from "@/lib/providers/map";
import { searchOffers } from "@/lib/providers/offer";
import { fitToBudget, formatGBP } from "@/lib/budget/math";
import { notPacked, stillNeeded } from "@/lib/checklist/status";
import { getStore } from "@/lib/store";
import { ageLabel } from "@/lib/cache";
import { WARWICK_CAMPUS, type LocationContext } from "@/lib/types";

/**
 * Rule-based answers for the handful of simple requests the spec lists, used when
 * no AI model key is configured. Every answer comes from the same tools/services
 * the model would call, so nothing is invented.
 */
export async function fallbackAnswer(userId: string, text: string, location: LocationContext | null): Promise<string> {
  const q = text.trim().toLowerCase();
  const loc = location ?? WARWICK_CAMPUS;
  const d = await loadDashboard(userId);

  const money = q.match(/£\s?(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s?(?:pounds|quid)/);
  const amount = money ? Number(money[1] ?? money[2]) : null;

  if (/(haven'?t|not) packed|what.*pack/.test(q)) {
    const list = notPacked(d.items).filter((i) => i.status !== "wait").slice(0, 25);
    if (list.length === 0) return "Everything is packed. Nice.";
    return `Not packed yet (${list.length} shown):\n` + list.map((i) => `• ${i.item} (${i.status.replace("_", " ")})`).join("\n");
  }

  const mark = q.match(/mark (?:the |my )?(.+?) as (bought|packed|have|need|buy)/) ?? q.match(/(?:i(?:'ve| have)? )?(bought|packed) (?:the |my )?(.+)/);
  if (mark) {
    const [name, status] = mark[0].startsWith("mark") ? [mark[1], mark[2]] : [mark[2], mark[1]];
    const item = findItemByName(d.items, name.replace(/[.!?]+$/, ""));
    if (!item) return `I couldn't find "${name}" on your checklist.`;
    const store = await getStore();
    await store.setChecklistStatus(userId, item.id, status as "bought" | "packed" | "have" | "need" | "buy");
    return `Done. ${item.item} is now marked ${status}.`;
  }

  if (amount !== null && /(left|spend|budget|buy)/.test(q)) {
    const ordered = stillNeeded(d.items).filter((i) => i.timing === "buy_before").sort((a, b) => ["essential", "recommended", "optional"].indexOf(a.priority) - ["essential", "recommended", "optional"].indexOf(b.priority));
    const priced = ordered.map((i) => ({ item: i.item, price: (i.budgetEstimate ?? 0) * i.qty }));
    const { chosen, total } = fitToBudget(priced, amount);
    if (chosen.length === 0) return `Nothing on the list fits in ${formatGBP(amount)} using the checklist estimates.`;
    return `With ${formatGBP(amount)}, buy these first (checklist estimates, not live prices):\n` + chosen.map((c) => `• ${c.item} ~${formatGBP(c.price)}`).join("\n") + `\nEstimated total ${formatGBP(total)}. Open Shop to check live prices.`;
  }

  if (/near me|nearby|today|one shop|one-shop/.test(q)) {
    if (!loc.coords) return "Share your location or enter a postcode to see nearby shops.";
    const res = await nearbyStores({ center: loc.coords, limit: 6 });
    if (res.stores.length === 0) return "I couldn't find shops near you.";
    return `Shops near ${loc.label} (${res.mock ? "mock, not live" : res.provider}; ${ageLabel(res.checkedAt)}). Store hours only - stock not confirmed:\n` + res.stores.map((s) => `• ${s.name} - ${s.distanceMeters ? (s.distanceMeters / 1000).toFixed(1) + " km" : ""}${s.openNow === null ? "" : s.openNow ? ", open now" : ", closed"}`).join("\n");
  }

  if (/discount|voucher|code|deal/.test(q)) {
    const retailer = d.basket[0]?.productSnapshot.retailer ?? "Argos";
    const res = await searchOffers({ retailer });
    const verified = res.offers.filter((o) => o.verified);
    const links = res.offers.filter((o) => o.studentVerificationRequired);
    let out = verified.length ? `Verified offers for ${retailer}:\n` + verified.map((o) => `• ${o.title}${o.code ? ` (code ${o.code})` : ""} - ends ${o.endDate ? new Date(o.endDate).toLocaleDateString("en-GB") : "n/a"}. ${o.terms}`).join("\n") : `I couldn't verify a current discount for ${retailer}.`;
    if (links.length) out += `\nCheck student discount: ` + links.map((l) => l.sourceUrl).join(" · ");
    return out;
  }

  const findQuery = q.match(/(?:find|search|cheapest|show)\s+(?:me\s+)?(?:the\s+|a\s+)?(?:cheapest\s+)?(.+?)(?:\s+(?:that|which|for|under|near).*)?$/);
  if (findQuery) {
    const item = findItemByName(d.items, findQuery[1]);
    const cmp = await compareProducts(userId, { query: item ? undefined : findQuery[1], itemId: item?.id, location: loc, maxPrice: amount ?? undefined });
    if (cmp.error) return cmp.error;
    const picks = [
      ["Cheapest", cmp.recommendations.cheapest],
      ["Best value", cmp.recommendations.bestValue],
      ["Nearby", cmp.recommendations.nearby],
    ] as const;
    const lines = picks.filter(([, p]) => p).map(([label, p]) => `• ${label}: ${p!.product.title} - ${formatGBP(p!.product.totalPrice)} at ${p!.product.retailer}${p!.warnings.length ? ` (${p!.warnings.join("; ")})` : ""}`);
    if (lines.length === 0) return `No suitable results for "${cmp.query}".` + (cmp.recommendations.excluded.length ? ` Excluded: ${cmp.recommendations.excluded.map((e) => `${e.product.title} (${e.reason})`).join(", ")}.` : "");
    return `${cmp.warning ? cmp.warning + "\n" : ""}${cmp.query} (${cmp.mock ? "mock, not live" : cmp.provider}; ${ageLabel(cmp.checkedAt)}):\n${lines.join("\n")}`;
  }

  return `I can help with: "What haven't I packed?", "Mark duvet as bought", "I have £80 left, what should I buy?", "What can I buy near me today?", "Find a student discount", "Find me the cheapest duvet". Still needed: ${d.summary.stillNeeded}. Budget left: ${d.budgetSummary.remaining === null ? "not set" : formatGBP(d.budgetSummary.remaining)}.`;
}
