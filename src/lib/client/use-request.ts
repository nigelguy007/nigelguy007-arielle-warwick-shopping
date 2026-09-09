"use client";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { ApiError } from "./api";

interface Entry<T> {
  status: "loading" | "success" | "error";
  data: T | undefined;
  error: string | null;
  fetchedAt: number;
}

// Tiny stale-while-revalidate store so components never call setState inside effects.
const cache = new Map<string, Entry<unknown>>();
const listeners = new Set<() => void>();
const STALE_MS = 60_000;

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function notify() {
  for (const l of listeners) l();
}

function start<T>(key: string, fetcher: (ctx: { refresh: boolean }) => Promise<T>, refresh: boolean) {
  const prev = cache.get(key) as Entry<T> | undefined;
  cache.set(key, { status: "loading", data: prev?.data, error: null, fetchedAt: prev?.fetchedAt ?? 0 });
  notify();
  fetcher({ refresh })
    .then((data) => {
      cache.set(key, { status: "success", data, error: null, fetchedAt: Date.now() });
    })
    .catch((err: unknown) => {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong";
      cache.set(key, { status: "error", data: prev?.data, error: message, fetchedAt: Date.now() });
    })
    .finally(notify);
}

export function useRequest<T>(key: string | null, fetcher: (ctx: { refresh: boolean }) => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  const entry = useSyncExternalStore(
    subscribe,
    () => (key ? (cache.get(key) as Entry<T> | undefined) : undefined),
    () => undefined,
  );

  useEffect(() => {
    if (!key) return;
    const existing = cache.get(key);
    if (!existing || (existing.status !== "loading" && Date.now() - existing.fetchedAt > STALE_MS)) start(key, (ctx) => fetcherRef.current(ctx), false);
  }, [key]);

  const refresh = useCallback(() => {
    if (key) start(key, (ctx) => fetcherRef.current(ctx), false);
  }, [key]);

  return { data: entry?.data, error: entry?.error ?? null, loading: !key ? false : !entry || entry.status === "loading", refresh };
}

export function invalidateRequests(prefix: string) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
  notify();
}
