"use client";
import { useState } from "react";
import { LocateFixed, School, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useLocationContext } from "@/lib/client/location";
import { isWarwickUniversityName } from "@/lib/university-match";

type Ctx = ReturnType<typeof useLocationContext>;

export function LocationPicker({ ctx, compact, university = null }: { ctx: Ctx; compact?: boolean; university?: string | null }) {
  const [postcode, setPostcode] = useState("");
  const [showPostcode, setShowPostcode] = useState(false);
  const showCampusShortcut = !university || isWarwickUniversityName(university);
  return (
    <div className="space-y-3">
      {ctx.location ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-4 w-4 shrink-0 text-accent" /> <span className="truncate">{ctx.location.label}</span>
        </p>
      ) : (
        <p className="text-sm text-muted">Share your location or enter a postcode to see nearby shops.</p>
      )}
      <div className={compact ? "flex gap-2" : "grid grid-cols-2 gap-2"}>
        <Button variant="secondary" size="sm" className="flex-1" onClick={ctx.useDevice} loading={ctx.status === "locating"}>
          <LocateFixed className="h-4 w-4" /> Use my location
        </Button>
        {showCampusShortcut ? (
          <Button variant="ghost" size="sm" className="flex-1" onClick={ctx.useCampus}>
            <School className="h-4 w-4" /> Warwick campus
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" className={compact ? "" : "col-span-2"} onClick={() => setShowPostcode((s) => !s)}>
          Enter a postcode
        </Button>
      </div>
      {showPostcode ? (
        <form
          className="glass flex h-[46px] items-center gap-2 rounded-full px-2 pl-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (postcode.trim()) void ctx.usePostcode(postcode.trim());
          }}
        >
          <Input
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="e.g. CV4 7AL"
            autoCapitalize="characters"
            aria-label="Postcode"
            className="h-auto flex-1 border-none bg-transparent px-0 py-0 text-[13px] focus-visible:ring-0"
          />
          <Button type="submit" size="sm" loading={ctx.status === "locating"}>
            Go
          </Button>
        </form>
      ) : null}
      {ctx.error ? <p className="text-xs text-warn">{ctx.error}</p> : null}
      <p className="text-[11px] text-muted">Location is only used for this search and isn&apos;t saved.</p>
    </div>
  );
}
