import Link from "next/link";
import { TERMS_SECTIONS, TERMS_VERSION } from "@/lib/legal/terms";

export const metadata = { title: "Terms & privacy notice" };

// Public - no auth required, so anyone can read it before deciding to sign
// up, and the onboarding terms step can link to it from a new tab.
export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-6 pb-10" style={{ paddingTop: "calc(var(--sat) + 2rem)" }}>
      <div className="flex flex-col gap-1.5">
        <Link href="/" className="text-sm font-semibold text-accent-ink">&larr; Back</Link>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">Terms &amp; privacy notice</h1>
        <p className="text-sm text-foreground-secondary">Version {TERMS_VERSION}</p>
      </div>
      <div className="flex flex-col gap-5">
        {TERMS_SECTIONS.map((s) => (
          <section key={s.heading} className="glass-card flex flex-col gap-1.5 px-4 py-3.5">
            <h2 className="font-display text-base font-bold">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-sm text-foreground-secondary">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
