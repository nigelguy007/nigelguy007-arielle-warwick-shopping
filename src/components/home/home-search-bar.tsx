"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Routes to Shop's own search rather than searching inline - Home has no
 * product index of its own, so this is a shortcut into the real search,
 * not a second implementation of it. */
export function HomeSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search essentials, kettles, bedding…" className="pl-9" aria-label="Search products" enterKeyHint="search" />
    </form>
  );
}
