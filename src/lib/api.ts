import "server-only";
import { z } from "zod";
import { log } from "@/lib/logger";

export function badRequest(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data;
}

export function handleError(route: string, err: unknown): Response {
  log.error("api.error", { route, error: err instanceof Error ? err.message : String(err) });
  return Response.json({ error: "Something went wrong on our side. Your checklist is safe - please try again." }, { status: 500 });
}
