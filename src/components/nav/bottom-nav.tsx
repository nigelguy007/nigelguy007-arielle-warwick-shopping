"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, ShoppingBag, Map, UserRound, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/map", label: "Map", icon: Map },
  { href: "/agent", label: "Agent", icon: Sparkles },
  { href: "/me", label: "Me", icon: UserRound },
] as const;

/**
 * The one docked bar: nav + agent entry point live together so there is
 * exactly one reserved height (--dock-h, set below) for every screen to pad
 * against - see .impeccable.md principle 4. A previous pass had the agent
 * button floating independently above this bar with a hand-tuned offset,
 * which drifted out of sync with the padding and clipped real content.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
      style={{ height: "var(--dock-h)", paddingBottom: "var(--sab)" }}
    >
      <ul className="mx-auto flex h-full max-w-lg justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("tap flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold", active ? "text-accent-ink" : "text-muted")}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
