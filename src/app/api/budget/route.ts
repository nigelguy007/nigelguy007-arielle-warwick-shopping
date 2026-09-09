import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { loadDashboard } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const d = await loadDashboard(user.id);
    return Response.json({ budget: d.budget, summary: d.budgetSummary, purchases: d.purchases, basketTotals: d.basketTotals });
  } catch (err) {
    return handleError("budget.get", err);
  }
}

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, z.object({ amount: z.number().min(0).max(100000), name: z.string().max(60).optional() }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const budget = await store.setBudget(user.id, Math.round(body.amount * 100) / 100, body.name);
    return Response.json({ budget });
  } catch (err) {
    return handleError("budget.post", err);
  }
}
