import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { requireUserOr401 } from "@/lib/auth";
import { badRequest } from "@/lib/api";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";
import { buildAgentTools } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { fallbackAnswer } from "@/lib/ai/fallback";
import { parseLocation } from "@/lib/services/location";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional(), source: z.string().optional(), postcode: z.string().nullable().optional() }).nullable().optional(),
});

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  return last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
}

export async function POST(req: Request) {
  const user = await requireUserOr401();
  if (user instanceof Response) return user;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return badRequest("Invalid chat request");
  const messages = parsed.data.messages as UIMessage[];
  const location = parsed.data.location ? parseLocation(parsed.data.location) : null;

  if (!env.aiConfigured) {
    // No model configured: answer the simple, common requests with rules over the same tools.
    const text = await fallbackAnswer(user.id, lastUserText(messages), location);
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        const id = "fallback-text";
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: text });
        writer.write({ type: "text-end", id });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const tools = buildAgentTools(user.id, location);
  const result = streamText({
    model: env.aiModel,
    system: SYSTEM_PROMPT + (location ? `\n\nThe user's current location context is: ${location.label}.` : "\n\nNo location shared yet; default to the Warwick campus and offer to use their location."),
    messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: stepCountIs(8),
    onError: ({ error }) => log.error("agent.error", { error: error instanceof Error ? error.message : String(error) }),
  });
  return result.toUIMessageStreamResponse({ onError: () => "I hit a problem answering that. Your checklist is safe - try again." });
}
