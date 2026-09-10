"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface DockContextValue {
  override: ReactNode | null;
  setOverride: (node: ReactNode | null) => void;
}

const DockContext = createContext<DockContextValue | null>(null);

/**
 * Lets a page swap the docked tab bar for something else that occupies the
 * same fixed slot - e.g. Checklist's multi-select bulk-action bar replacing
 * the tabs while select mode is active, matching the design handoff.
 */
export function DockProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<ReactNode | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useDock() {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error("useDock must be used within DockProvider");
  return ctx;
}
