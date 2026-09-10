// Orchestrates one alerts sweep. Deliberately free of "server-only" imports and of
// direct imports of the real store/providers/notifier - everything it needs is
// passed in, so this module (unlike the API route that wires it up) can be
// unit-tested with plain fakes.
import type { BasketItem, ChecklistView, OfferResult, OfferSearchInput, ProductSearchInput, ProductSearchResult } from "@/lib/types";
import type { DataStore } from "@/lib/store/types";
import type { Notifier, AlertNotification } from "@/lib/notify/types";
import { matchTrackedProduct, evaluatePriceChange, priceDropNotification, voucherExpiryNotification } from "./detect";
import { isNearingExpiry } from "@/lib/offers/expiry";

type AlertStore = Pick<DataStore, "listBasket" | "getUserChecklistItem" | "getPriceWatch" | "recordPriceObservation">;

export interface AlertDeps {
  store: AlertStore;
  searchProducts: (input: ProductSearchInput) => Promise<{ results: ProductSearchResult[] }>;
  searchOffers: (input: OfferSearchInput) => Promise<{ offers: OfferResult[] }>;
  notifier: Notifier;
  now?: Date;
  /** Minimum saving before a price change is worth alerting on. */
  minDropAmount?: number;
  /** How many days out a voucher must be from expiring to be worth alerting on. */
  expiryThresholdDays?: number;
}

export interface UserAlertSummary {
  userId: string;
  priceDropsFound: number;
  vouchersExpiringFound: number;
  notified: boolean;
  notifyChannel: string | null;
  errors: string[];
}

async function searchQueryFor(store: AlertStore, userId: string, line: BasketItem): Promise<string> {
  if (line.checklistItemId) {
    const checklistItem: ChecklistView | null = await store.getUserChecklistItem(userId, line.checklistItemId);
    if (checklistItem) return checklistItem.item;
  }
  return line.productSnapshot.title;
}

/** Runs both checks for a single user's basket and sends whatever is due. */
export async function runAlertsForUser(userId: string, email: string | null, deps: AlertDeps): Promise<UserAlertSummary> {
  const now = deps.now ?? new Date();
  const minDrop = deps.minDropAmount ?? 0.5;
  const expiryDays = deps.expiryThresholdDays ?? 3;
  const errors: string[] = [];
  const notifications: AlertNotification[] = [];

  const basket = await deps.store.listBasket(userId);
  const retailers = new Set<string>();

  for (const line of basket) {
    retailers.add(line.productSnapshot.retailer);
    const itemKey = line.checklistItemId ?? `basket:${line.id}`;
    // The checklist item's own name (when linked) is used only as the search
    // query below; `label` stays the exact listing title so matching and the
    // alert copy both refer to the specific product the user is tracking.
    const label = line.productSnapshot.title;
    try {
      const query = await searchQueryFor(deps.store, userId, line);
      const search = await deps.searchProducts({ query, limit: 10 });
      const matched = matchTrackedProduct(search.results, { label, productId: line.productSnapshot.id, retailer: line.productSnapshot.retailer });
      if (!matched) continue; // no confident match in the fresh results - never guess a comparison
      const lastWatch = await deps.store.getPriceWatch(userId, itemKey);
      const change = evaluatePriceChange(matched, lastWatch, minDrop);
      if (change.isDrop) notifications.push(priceDropNotification(label, matched.retailer, change, matched.productUrl, matched.currency));
      await deps.store.recordPriceObservation(userId, itemKey, { label, retailer: matched.retailer, price: change.currentPrice, currency: matched.currency, productUrl: matched.productUrl });
    } catch (err) {
      errors.push(`price check failed for "${label}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let vouchersExpiringFound = 0;
  for (const retailer of retailers) {
    try {
      const { offers } = await deps.searchOffers({ retailer });
      for (const offer of offers) {
        if (isNearingExpiry(offer, expiryDays, now)) {
          vouchersExpiringFound++;
          notifications.push(voucherExpiryNotification(offer, now));
        }
      }
    } catch (err) {
      errors.push(`offer check failed for "${retailer}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let notified = false;
  let notifyChannel: string | null = null;
  if (notifications.length > 0) {
    try {
      const result = await deps.notifier.send({ userId, email }, notifications);
      notified = result.sent;
      notifyChannel = result.channel;
    } catch (err) {
      errors.push(`notify failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    userId,
    priceDropsFound: notifications.filter((n) => n.kind === "price_drop").length,
    vouchersExpiringFound,
    notified,
    notifyChannel,
    errors,
  };
}

export interface RunAllDeps extends AlertDeps {
  listUserIds: () => Promise<string[]>;
  resolveEmail: (userId: string) => Promise<string | null>;
}

export interface AlertsRunSummary {
  ranAt: string;
  usersProcessed: number;
  totalPriceDrops: number;
  totalVouchersExpiring: number;
  totalNotified: number;
  users: UserAlertSummary[];
}

/** Sweeps every known user. Used by the cron-triggered API route. */
export async function runAlertsForAllUsers(deps: RunAllDeps): Promise<AlertsRunSummary> {
  const now = deps.now ?? new Date();
  const userIds = await deps.listUserIds();
  const users: UserAlertSummary[] = [];
  for (const userId of userIds) {
    const email = await deps.resolveEmail(userId);
    users.push(await runAlertsForUser(userId, email, { ...deps, now }));
  }
  return {
    ranAt: now.toISOString(),
    usersProcessed: users.length,
    totalPriceDrops: users.reduce((a, u) => a + u.priceDropsFound, 0),
    totalVouchersExpiring: users.reduce((a, u) => a + u.vouchersExpiringFound, 0),
    totalNotified: users.filter((u) => u.notified).length,
    users,
  };
}
