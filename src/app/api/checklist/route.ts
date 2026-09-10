import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { loadDashboard } from "@/lib/services/dashboard";
import { PRIORITIES, TIMINGS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const d = await loadDashboard(user.id);
    return Response.json({ items: d.items, summary: d.summary, accommodation: d.accommodation, supplied: d.supplied.map((s) => s.id), buyNext: d.buyNext, budget: d.budgetSummary });
  } catch (err) {
    return handleError("checklist", err);
  }
}

const createSchema = z.object({
  category: z.string().min(1).max(40),
  item: z.string().min(1).max(80),
  qty: z.number().int().min(1).max(99).optional(),
  notes: z.string().max(300).optional(),
  priority: z.enum(PRIORITIES).optional(),
  timing: z.enum(TIMINGS).optional(),
  budgetEstimate: z.number().min(0).max(10000).nullable().optional(),
});

/** A student adding their own item, not part of the shared 77 - see
 * DataStore.addCustomChecklistItem. */
export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, createSchema);
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const item = await store.addCustomChecklistItem(user.id, body);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return handleError("checklist.post", err);
  }
}
