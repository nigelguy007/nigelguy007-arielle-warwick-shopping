"use client";
import { useEffect, useState } from "react";
import { agoLabel } from "@/lib/utils";
import { MockBadge } from "./badge";
import { RefreshCw } from "lucide-react";

export function SourceLine({ provider, checkedAt, mock, confidence, onRefresh, refreshing }: { provider: string; checkedAt: string; mock: boolean; confidence?: string; onRefresh?: () => void; refreshing?: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span>
        Source: <span className="font-medium text-foreground">{mock ? "mock" : provider}</span>
        {confidence && !mock ? ` · ${confidence}` : ""}
      </span>
      <span aria-hidden>·</span>
      <span suppressHydrationWarning>{agoLabel(checkedAt)}</span>
      <MockBadge mock={mock} />
      {onRefresh ? (
        <button type="button" onClick={onRefresh} disabled={refreshing} className="tap ml-auto inline-flex items-center gap-1 rounded-full px-2 text-xs font-semibold text-accent-ink disabled:opacity-50">
          <RefreshCw className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
        </button>
      ) : null}
    </div>
  );
}
