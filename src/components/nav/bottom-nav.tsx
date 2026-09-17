"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, SparkleIcon, TAB_ICON_PATH } from "@/components/ui/icons";
import { useDock } from "@/lib/client/dock-context";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", path: TAB_ICON_PATH.home },
  { href: "/checklist", label: "List", path: TAB_ICON_PATH.checklist },
  { href: "/shop", label: "Shop", path: TAB_ICON_PATH.shop },
  { href: "/map", label: "Map", path: TAB_ICON_PATH.map },
  { href: "/me", label: "Me", path: TAB_ICON_PATH.me },
] as const;

/**
 * The docked bottom bar: a white tab-bar pill + a sage FAB that opens the
 * AI agent (14 tools, streaming chat). Checklist's multi-select mode swaps
 * this whole bar for a bulk-action bar via useDock() - see dock-context.tsx.
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { override } = useDock();

  if (override) {
    return (
      <div className="fixed right-3.5 bottom-6 left-3.5 z-30" style={{ paddingBottom: "var(--sab)" }}>
        {override}
      </div>
    );
  }

  const active = pathname.startsWith("/checklist") ? "/checklist" : pathname;

  return (
    <div className="fixed right-3.5 bottom-6 left-3.5 z-30 mx-auto flex max-w-lg items-center gap-2.5" style={{ paddingBottom: "var(--sab)" }}>
      <nav aria-label="Main" className="glass h-15 flex-1 overflow-hidden rounded-full" style={{ boxShadow: "var(--bar-shadow)" }}>
        <ul className="flex h-full">
          {TABS.map((t) => {
            const isActive = t.href === "/" ? active === "/" : active.startsWith(t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn("tap flex h-full flex-col items-center justify-center gap-0.5 text-[10px]", isActive ? "font-bold text-accent-ink" : "font-semibold text-foreground-secondary")}
                >
                  <Icon path={t.path} size={20} sw={isActive ? 2.2 : 1.8} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <button
        type="button"
        onClick={() => router.push("/agent")}
        aria-label="Ask Arielle's Agent"
        className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ boxShadow: "var(--fab-shadow)" }}
      >
        <SparkleIcon size={22} />
      </button>
    </div>
  );
}
