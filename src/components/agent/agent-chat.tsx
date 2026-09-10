"use client";
import { useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { SendHorizontal } from "lucide-react";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readStoredLocation } from "@/lib/client/location";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["What haven't I packed?", "I have £80 left, what should I buy?", "Find me the cheapest duvet", "What can I buy near me today?", "Find a student discount", "Show me everything I can get at one shop"];

function textOf(m: UIMessage) {
  return m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
}
function toolsOf(m: UIMessage) {
  return m.parts.filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool").map((p) => (p.type === "dynamic-tool" ? (p as { toolName: string }).toolName : p.type.replace(/^tool-/, "")));
}

export function AgentChat({ aiConfigured }: { aiConfigured: boolean }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ messages }) => {
          const loc = readStoredLocation();
          return { body: { messages, location: loc?.coords ? { lat: loc.coords.lat, lng: loc.coords.lng, label: loc.label, source: loc.source, postcode: loc.postcode } : null } };
        },
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  const send = (t: string) => {
    if (!t.trim() || busy) return;
    void sendMessage({ text: t.trim() });
    setText("");
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  return (
    <div className="flex min-h-[70dvh] flex-col px-4">
      {!aiConfigured ? <p className="mb-2 rounded-2xl bg-mock-soft px-4 py-2 text-xs text-mock">Simple mode: no AI model key is set, so I answer the common questions with rules. Add AI_GATEWAY_API_KEY and AI_MODEL for full conversation.</p> : null}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 ? <p className="pt-6 text-center text-sm text-muted">Ask me what to buy, where, and for how much.</p> : null}
        {messages.map((m) => {
          const tools = toolsOf(m);
          const t = textOf(m);
          return (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed", m.role === "user" ? "bg-accent text-white" : "card")}>
                {tools.length ? <p className="mb-1 text-[11px] text-muted">Checked: {tools.join(", ")}</p> : null}
                {t || (m.role === "assistant" && busy ? "…" : "")}
              </div>
            </div>
          );
        })}
        {error ? <p className="text-sm text-warn">I hit a problem answering that. Your checklist is safe - try again.</p> : null}
      </div>
      <ChipRow className="pb-2">
        {SUGGESTIONS.map((s) => (
          <Chip key={s} onClick={() => send(s)} disabled={busy}>{s}</Chip>
        ))}
      </ChipRow>
      <form className="flex gap-2 pb-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything about your move-in" aria-label="Message" enterKeyHint="send" />
        <Button type="submit" aria-label="Send" loading={busy}><SendHorizontal className="h-5 w-5" /></Button>
      </form>
    </div>
  );
}
