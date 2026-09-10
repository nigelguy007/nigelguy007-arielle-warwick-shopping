import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { getAdminStore } from "@/lib/store";
import { searchProducts } from "@/lib/providers/product";
import { searchOffers } from "@/lib/providers/offer";
import { getNotifier } from "@/lib/notify";
import { runAlertsForAllUsers } from "@/lib/alerts/run";
import { resolveUserEmail } from "@/lib/alerts/resolve-email";

/**
 * Designed to be hit by an external scheduler, not a browser. Wire it up with
 * Vercel Cron: see the `crons` entry in vercel.json (runs this on a schedule
 * once deployed - Vercel Cron is not available in this dev environment, so it
 * has never actually fired here). Vercel signs cron requests with
 * `Authorization: Bearer $CRON_SECRET`; set CRON_SECRET to the same value in
 * both the Vercel project settings and vercel.json's cron config, or call this
 * manually (curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/alerts/run)
 * to test it. Detects real price drops and near-expiry vouchers for every user's
 * basket; delivery goes through whatever `getNotifier()` resolves to
 * (Resend if configured, else the console notifier - see src/lib/notify).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorised(req: Request): boolean {
  const secret = env.cronSecret;
  if (!secret) return !env.isProduction;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request): Promise<Response> {
  if (!isAuthorised(req)) {
    if (!env.cronSecret) {
      return Response.json({ error: "CRON_SECRET is not set. Refusing to run against real user data without one; set CRON_SECRET to enable this endpoint." }, { status: 503 });
    }
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const store = await getAdminStore();
    const notifier = getNotifier();
    const summary = await runAlertsForAllUsers({
      store,
      notifier,
      searchProducts: (input) => searchProducts(input),
      searchOffers: (input) => searchOffers(input),
      minDropAmount: env.priceDropAlertMin,
      expiryThresholdDays: env.voucherExpiryAlertDays,
      listUserIds: () => store.listProfileUserIds(),
      resolveEmail: (userId) => resolveUserEmail(userId),
    });
    log.info("alerts.run", {
      usersProcessed: summary.usersProcessed,
      totalPriceDrops: summary.totalPriceDrops,
      totalVouchersExpiring: summary.totalVouchersExpiring,
      totalNotified: summary.totalNotified,
      notifier: notifier.name,
    });
    return Response.json(summary);
  } catch (err) {
    log.error("alerts.run.error", { error: err instanceof Error ? err.message : String(err) });
    return Response.json({ error: "Alert run failed. No alerts were sent this run." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
