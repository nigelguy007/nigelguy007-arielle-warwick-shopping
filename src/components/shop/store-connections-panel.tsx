"use client";
import { useEffect, useState } from "react";
import { AuthorizeSheet } from "./authorize-sheet";
import { SpinnerIcon, CheckIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { connectionMethodFor } from "@/lib/stores/known-api";
import type { StoreConnection, StoreMethod } from "@/lib/types";

const DEFAULT_RETAILERS = ["Amazon UK", "Argos", "Dunelm", "Tesco", "John Lewis"];

type RowStatus = "idle" | "searching" | "found" | "connecting" | "connected";
interface RowState { status: RowStatus; method: StoreMethod | null }

/**
 * Store connections: lets a student connect a retailer so its real prices
 * and stock show up everywhere else in the app. Nothing is claimed
 * connected until they actually tap Allow on the authorization sheet - see
 * connect/route.ts. The idle/searching/found sequence before that is purely
 * client-side UI polish (matching the design handoff), not a real network
 * call - the first real request happens only on Allow.
 */
export function StoreConnectionsPanel() {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [customInput, setCustomInput] = useState("");
  const [extraRetailers, setExtraRetailers] = useState<string[]>([]);
  const [authRetailer, setAuthRetailer] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    api<{ connections: StoreConnection[] }>("/api/stores")
      .then(({ connections }) => {
        const next: Record<string, RowState> = {};
        for (const c of connections) next[c.retailer] = { status: "connected", method: c.method };
        setRows(next);
        setExtraRetailers((prev) => [...prev, ...connections.map((c) => c.retailer).filter((r) => !DEFAULT_RETAILERS.includes(r) && !prev.includes(r))]);
      })
      .catch(() => undefined);
  }, []);

  const retailers = [...DEFAULT_RETAILERS, ...extraRetailers.filter((r) => !DEFAULT_RETAILERS.includes(r))];

  const startConnect = (retailer: string) => {
    setRows((r) => ({ ...r, [retailer]: { status: "searching", method: null } }));
    // Purely a UI moment - see the file docstring. Nothing is sent yet.
    setTimeout(() => {
      setRows((r) => (r[retailer]?.status === "searching" ? { ...r, [retailer]: { status: "found", method: connectionMethodFor(retailer) } } : r));
      setAuthRetailer(retailer);
    }, 900);
  };

  const cancelAuth = () => {
    const retailer = authRetailer;
    setAuthRetailer(null);
    if (retailer) setRows((r) => (r[retailer]?.status === "found" ? { ...r, [retailer]: { status: "idle", method: null } } : r));
  };

  const allow = async () => {
    const retailer = authRetailer;
    if (!retailer) return;
    setConnecting(true);
    setRows((r) => ({ ...r, [retailer]: { status: "connecting", method: r[retailer]?.method ?? null } }));
    try {
      const { connection } = await api<{ connection: StoreConnection }>("/api/stores/connect", { method: "POST", body: JSON.stringify({ retailer }) });
      setRows((r) => ({ ...r, [retailer]: { status: "connected", method: connection.method } }));
      setAuthRetailer(null);
    } catch {
      setRows((r) => ({ ...r, [retailer]: { status: "idle", method: null } }));
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async (retailer: string) => {
    setRows((r) => ({ ...r, [retailer]: { status: "idle", method: null } }));
    setExpanded((e) => ({ ...e, [retailer]: false }));
    await api("/api/stores/disconnect", { method: "POST", body: JSON.stringify({ retailer }) }).catch(() => undefined);
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name) return;
    if (!retailers.some((r) => r.toLowerCase() === name.toLowerCase())) setExtraRetailers((prev) => [...prev, name]);
    setCustomInput("");
    startConnect(name);
  };

  const connectedCount = Object.values(rows).filter((r) => r.status === "connected").length;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-base font-extrabold">Store connections</span>
        <span className="text-xs text-muted">{connectedCount} connected</span>
      </div>
      <div className="glass-card divide-y divide-border overflow-hidden p-0">
        {retailers.map((retailer) => {
          const row = rows[retailer] ?? { status: "idle" as const, method: null };
          const isExpanded = !!expanded[retailer];
          return (
            <div key={retailer}>
              <button
                type="button"
                onClick={() => { if (row.status === "connected") setExpanded((e) => ({ ...e, [retailer]: !e[retailer] })); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-extrabold text-accent-ink">{retailer.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{retailer}</div>
                  <div className="text-xs text-muted">
                    {row.status === "idle" && "Not connected"}
                    {row.status === "searching" && "Looking for a connection…"}
                    {row.status === "found" && "Tap to finish connecting"}
                    {row.status === "connecting" && "Connecting…"}
                    {row.status === "connected" && "Saved · doesn't change the prices shown yet"}
                  </div>
                </div>
                {row.status === "idle" ? (
                  <span onClick={(e) => { e.stopPropagation(); startConnect(retailer); }} role="button" tabIndex={0} className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-on-accent">
                    Connect
                  </span>
                ) : null}
                {row.status === "found" ? (
                  <span onClick={(e) => { e.stopPropagation(); setAuthRetailer(retailer); }} role="button" tabIndex={0} className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-ink">
                    Finish
                  </span>
                ) : null}
                {row.status === "searching" || row.status === "connecting" ? <SpinnerIcon size={18} className="text-accent" /> : null}
                {row.status === "connected" ? <CheckIcon size={20} className="text-success" /> : null}
              </button>
              {isExpanded ? (
                <div className="flex items-center justify-between px-4 pb-3">
                  <span className="text-[11.5px] text-muted">Not wired up to live prices or stock yet</span>
                  <button type="button" onClick={() => disconnect(retailer)} className="text-xs font-bold text-danger">Disconnect</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="glass flex h-[46px] items-center gap-2 rounded-full px-2 pl-4">
        <Input value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Add any store — e.g. Zara Home, B&M" className="h-auto flex-1 border-none bg-transparent px-0 py-0 text-[13px] focus-visible:ring-0" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
        <button type="button" onClick={addCustom} className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-on-accent">Find</button>
      </div>
      <p className="px-1 text-[11px] leading-relaxed text-muted">We look for a way to read that store&apos;s prices automatically. You&apos;ll always see exactly what it can access before anything connects.</p>
      <AuthorizeSheet
        open={!!authRetailer}
        retailer={authRetailer ?? ""}
        onCancel={cancelAuth}
        onAllow={allow}
        connecting={connecting}
      />
    </div>
  );
}
