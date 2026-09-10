import { requireUser } from "@/lib/auth";
import { AcceptInvite } from "@/components/share/accept-invite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accept invite" };

export default async function ShareCodePage({ params }: { params: Promise<{ code: string }> }) {
  await requireUser();
  const { code } = await params;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6" style={{ paddingTop: "var(--sat)" }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">You&apos;ve been invited</h1>
        <p className="text-muted">Accept to see their Warwick move-in checklist and budget.</p>
      </div>
      <AcceptInvite code={code.toUpperCase()} />
    </main>
  );
}
