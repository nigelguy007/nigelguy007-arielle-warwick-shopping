import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  try {
    const store = await getStore();
    return Response.json({ profile: await store.getProfile(user.id), mode: user.mode, email: user.email });
  } catch (err) {
    return handleError("profile.get", err);
  }
}

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  const body = await parseJson(req, z.object({ firstName: z.string().max(40).optional(), accommodationSlug: z.string().max(60).nullable().optional(), defaultPostcode: z.string().max(10).nullable().optional(), onboardingComplete: z.boolean().optional(), budget: z.number().min(0).max(100000).nullable().optional() }));
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const { budget, ...patch } = body;
    const profile = await store.upsertProfile(user.id, patch);
    if (typeof budget === "number") await store.setBudget(user.id, budget);
    return Response.json({ profile });
  } catch (err) {
    return handleError("profile.post", err);
  }
}
