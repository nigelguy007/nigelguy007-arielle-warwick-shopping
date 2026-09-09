import { requireUserOr401 } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { loadDashboard } from "@/lib/services/dashboard";

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
