import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { BottomNav } from "@/components/nav/bottom-nav";
import { DockProvider } from "@/lib/client/dock-context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await getStore();
  const profile = await store.getProfile(user.id);
  if (!profile?.onboardingComplete) redirect("/onboarding");
  return (
    <DockProvider>
      <div className="mx-auto min-h-dvh max-w-lg dock-pad">
        {children}
        <BottomNav />
      </div>
    </DockProvider>
  );
}
