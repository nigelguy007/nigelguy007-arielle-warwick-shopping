import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { handleError, parseJson } from "@/lib/api";
import { getStore } from "@/lib/store";
import { TERMS_VERSION } from "@/lib/legal/terms";

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
  const body = await parseJson(
    req,
    z.object({
      firstName: z.string().max(40).optional(),
      university: z.string().max(120).optional(),
      universityLocation: z.string().max(120).nullable().optional(),
      yearOfStudy: z.string().max(40).nullable().optional(),
      accommodationSlug: z.string().max(60).nullable().optional(),
      defaultPostcode: z.string().max(10).nullable().optional(),
      moveInDate: z.string().max(10).nullable().optional(),
      notifyPriceAlerts: z.boolean().optional(),
      notifyVoucherExpiry: z.boolean().optional(),
      notifyWeeklyDigest: z.boolean().optional(),
      onboardingComplete: z.boolean().optional(),
      budget: z.number().min(0).max(100000).nullable().optional(),
      /** True only when the user just ticked "I agree" on the terms step. The
       * timestamp + version are stamped here, server-side, rather than trusted
       * from the client, so termsAcceptedAt is real proof of consent. */
      termsAccepted: z.boolean().optional(),
    }),
  );
  if (body instanceof Response) return body;
  try {
    const store = await getStore();
    const { budget, termsAccepted, ...patch } = body;
    const consent = termsAccepted ? { termsAcceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION } : {};
    const profile = await store.upsertProfile(user.id, { ...patch, ...consent });
    if (typeof budget === "number") await store.setBudget(user.id, budget);
    return Response.json({ profile });
  } catch (err) {
    return handleError("profile.post", err);
  }
}
