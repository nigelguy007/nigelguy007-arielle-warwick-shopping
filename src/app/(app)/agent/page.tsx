import { PageHeader } from "@/components/nav/page-header";
import { AgentChat } from "@/components/agent/agent-chat";
import { env } from "@/lib/env";

export const metadata = { title: "Arielle's Agent" };

export default function AgentPage() {
  return (
    <main>
      <PageHeader title="Arielle's Agent" back="/" subtitle="Practical, honest, budget-first" />
      <AgentChat aiConfigured={env.aiConfigured} />
    </main>
  );
}
