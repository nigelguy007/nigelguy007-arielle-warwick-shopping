"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

/** Routes to Shop's own search rather than searching inline - Home has no
 * product index of its own, so this is a shortcut into the real search,
 * not a second implementation of it. The trailing sliders icon opens Shop
 * itself, where the actual filters (offers, location) live. */
export function HomeSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
      }}
      className="glass flex h-[52px] items-center gap-3 rounded-full pr-2 pl-4"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search kettles, bedding, lamps…"
        aria-label="Search products"
        enterKeyHint="search"
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted"
      />
      <Link href="/shop" aria-label="Open shop filters" className="tap flex h-10 w-10 items-center justify-center rounded-full text-foreground-secondary">
        <SlidersHorizontal className="h-[18px] w-[18px]" />
      </Link>
    </form>
  );
}
