import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { BottomNav } from "@/components/nav/bottom-nav";
import { AgentFab } from "@/components/nav/agent-fab";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await getStore();
  const profile = await store.getProfile(user.id);
  if (!profile?.onboardingComplete) redirect("/onboarding");
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-28">
      {children}
      <AgentFab />
      <BottomNav />
    </div>
  );
}
