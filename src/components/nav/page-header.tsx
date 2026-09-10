import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, back, subtitle, right }: { title: string; back?: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-4 pb-2" style={{ paddingTop: "calc(var(--sat) + 1rem)" }}>
      {back ? (
        <Link href={back} aria-label="Back" className="tap -ml-2 inline-flex items-center justify-center rounded-full text-foreground">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="font-display truncate text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
