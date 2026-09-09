import { providerStatus } from "@/lib/env";
import { metricsSnapshot } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, time: new Date().toISOString(), providers: providerStatus(), metrics: metricsSnapshot() });
}
