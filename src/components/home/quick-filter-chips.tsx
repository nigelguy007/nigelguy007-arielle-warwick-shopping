"use client";
import { useRouter } from "next/navigation";
import { Chip, ChipRow } from "@/components/ui/chip";

/** Home's row of shortcuts into the real Checklist filters - not a second
 * filtering implementation, just links with the right query params
 * (checklist-client.tsx reads both `filter` and `category` on load). */
export function QuickFilterChips({ categories }: { categories: string[] }) {
  const router = useRouter();
  return (
    <ChipRow className="-mx-5 px-5">
      <Chip active onClick={() => router.push("/checklist?filter=essentials")}>Essentials</Chip>
      {categories.map((c) => (
        <Chip key={c} onClick={() => router.push(`/checklist?category=${encodeURIComponent(c)}`)}>{c}</Chip>
      ))}
    </ChipRow>
  );
}
