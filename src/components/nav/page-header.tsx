import Link from "next/link";
import { Icon, MISC_ICON_PATH } from "@/components/ui/icons";

export function PageHeader({ title, back, subtitle, right }: { title: string; back?: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: "calc(var(--sat) + 1.25rem)" }}>
      {back ? (
        <Link href={back} aria-label="Back" className="glass tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground">
          <Icon path={MISC_ICON_PATH.back} size={16} sw={2.4} />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="font-display truncate text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-foreground-secondary">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
