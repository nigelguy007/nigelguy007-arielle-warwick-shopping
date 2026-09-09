"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import { WARWICK_CAMPUS, type LocationContext } from "@/lib/types";

const KEY = "aw:location";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: LocationContext | null = null;

/** Transient location kept in sessionStorage only. Sent to the server only as search parameters. */
export function readStoredLocation(): LocationContext | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as LocationContext) : null;
    } catch {
      cachedValue = null;
    }
  }
  return cachedValue;
}

function writeStoredLocation(loc: LocationContext | null) {
  try {
    if (loc) sessionStorage.setItem(KEY, JSON.stringify(loc));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function locationParams(loc: LocationContext | null): Record<string, string> {
  if (!loc?.coords) return {};
  return { lat: String(loc.coords.lat), lng: String(loc.coords.lng), source: loc.source, label: loc.label, ...(loc.postcode ? { postcode: loc.postcode } : {}) };
}

export function useLocationContext() {
  const location = useSyncExternalStore(subscribe, readStoredLocation, () => null);
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback((loc: LocationContext | null) => writeStoredLocation(loc), []);

  const useDevice = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location isn't available on this device. Try a postcode.");
      setStatus("error");
      return;
    }
    setStatus("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        writeStoredLocation({ label: "Your location", source: "device", coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, postcode: null });
        setStatus("idle");
      },
      () => {
        setError("I couldn't get your location. Share your location or enter a postcode to see nearby shops.");
        setStatus("error");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const useCampus = useCallback(() => {
    writeStoredLocation(WARWICK_CAMPUS);
    setError(null);
    setStatus("idle");
  }, []);

  const usePostcode = useCallback(async (postcode: string) => {
    setStatus("locating");
    setError(null);
    try {
      const res = await fetch(`/api/location/geocode?postcode=${encodeURIComponent(postcode)}`);
      const data = (await res.json()) as { location?: LocationContext; error?: string };
      if (!res.ok || !data.location) throw new Error(data.error ?? "Couldn't find that postcode");
      writeStoredLocation(data.location);
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't find that postcode");
      setStatus("error");
    }
  }, []);

  return { location, status, error, useDevice, useCampus, usePostcode, setLocation };
}
