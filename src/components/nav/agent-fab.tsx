"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export function AgentFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/agent")) return null;
  return (
    <Link href="/agent" className="fixed right-4 z-40 inline-flex h-13 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-white shadow-lg shadow-black/20 active:scale-95" style={{ bottom: "calc(var(--sab) + 4.75rem)" }}>
      <Sparkles className="h-5 w-5" /> Ask Arielle&apos;s Agent
    </Link>
  );
}
