import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6" style={{ paddingTop: "var(--sat)" }}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warwick Move-In</h1>
        <p className="text-muted">Sign in to see your checklist and budget.</p>
      </div>
      {env.dataMode === "local" ? (
        <p className="card p-4 text-sm">Demo mode is on. <Link href="/" className="font-semibold text-accent-ink">Continue</Link></p>
      ) : (
        <LoginForm next={next && next.startsWith("/") ? next : "/"} />
      )}
    </main>
  );
}
