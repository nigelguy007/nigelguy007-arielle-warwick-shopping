import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { badRequest, handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Contributions toward one owner's "pot". Readable by the owner and anyone they
 * shared budget access with (RLS/LocalStore enforce this on ownerId, not the caller). */
export async function GET(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const ownerId = new URL(req.url).searchParams.get("ownerId");
  if (!ownerId) return badRequest("ownerId is required");
  try {
    const store = await getStore();
    return Response.json({ contributions: await store.listContributions(ownerId) });
  } catch (err) {
    return handleError("contributions.get", err);
  }
}

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(
    req,
    z.object({
      ownerId: z.string().min(1),
      amount: z.number().min(0.01).max(100000),
      note: z.string().max(200).default(""),
      checklistItemId: z.string().nullable().default(null),
      contributorName: z.string().trim().max(60).default(""),
    }),
  );
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const { ownerId, contributorName, ...input } = body;
    const contribution = await store.addContribution(ownerId, user.id, contributorName || "A parent", { amount: Math.round(input.amount * 100) / 100, note: input.note, checklistItemId: input.checklistItemId });
    return Response.json({ contribution }, { status: 201 });
  } catch (err) {
    return handleError("contributions.post", err);
  }
}
