import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; error?: string }> }) {
  const { next, mode, error } = await searchParams;
  const user = await getCurrentUser();
  const safeNext = next && next.startsWith("/") ? next : "/";
  if (user) redirect(safeNext);
  const signup = mode === "signup";
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6" style={{ paddingTop: "var(--sat)" }}>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-foreground-secondary">{signup ? "Set up your move-in kit" : "Welcome back"}</p>
        <h1 className="font-display text-[32px] leading-none font-extrabold tracking-tight">{signup ? "Create your account" : "Sign in to UniKit"}</h1>
      </div>
      {env.dataMode === "local" ? (
        <p className="card p-4 text-sm">Demo mode is on. <Link href="/" className="font-semibold text-accent-ink">Continue</Link></p>
      ) : (
        <>
          {error === "link" ? <p className="text-sm text-danger" role="alert">That link is invalid or has expired. Sign in below.</p> : null}
          <LoginForm next={safeNext} initialMode={signup ? "signup" : "signin"} />
        </>
      )}
    </main>
  );
}
