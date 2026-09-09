"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, ShoppingBag, Map, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/map", label: "Map", icon: Map },
  { href: "/me", label: "Me", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur" style={{ paddingBottom: "var(--sab)" }}>
      <ul className="mx-auto flex max-w-lg justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("tap flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", active ? "text-accent-ink" : "text-muted")}>
                <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
