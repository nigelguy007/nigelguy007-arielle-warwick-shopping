"use client";
import type { ChecklistStatus } from "@/lib/types";

const KEY = "aw:pending-status";
interface Pending {
  id: string;
  status: ChecklistStatus;
  at: number;
}

const listeners = new Set<() => void>();
export function subscribePending(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}
function notify() {
  for (const l of listeners) l();
}

export function queueStatus(id: string, status: ChecklistStatus) {
  try {
    const list = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Pending[]).filter((p) => p.id !== id);
    list.push({ id, status, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list));
    notify();
  } catch {
    /* ignore */
  }
}

export function pendingCount(): number {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as Pending[]).length;
  } catch {
    return 0;
  }
}

/** Replays queued status changes. Returns how many were synced. */
export async function flushQueue(): Promise<number> {
  let list: Pending[] = [];
  try {
    list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Pending[];
  } catch {
    return 0;
  }
  if (list.length === 0) return 0;
  let synced = 0;
  const remaining: Pending[] = [];
  for (const p of list) {
    try {
      const res = await fetch(`/api/checklist/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: p.status }) });
      if (res.ok || res.status === 400) synced++;
      else remaining.push(p);
    } catch {
      remaining.push(p);
    }
  }
  localStorage.setItem(KEY, JSON.stringify(remaining));
  notify();
  return synced;
}
