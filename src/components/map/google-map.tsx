"use client";
import { useEffect, useRef } from "react";
import type { LatLng, StoreResult } from "@/lib/types";

declare global {
  interface Window {
    __awMapsLoaded?: Promise<void>;
  }
}

function loadMaps(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  window.__awMapsLoaded ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&region=GB&language=en-GB`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return window.__awMapsLoaded;
}

/** Reads a design token as a plain CSS color string - Google Maps' Marker/
 * Symbol icon API renders its own SVG and doesn't resolve CSS custom
 * properties itself, so the var(--x) values from globals.css have to be
 * read out as computed strings first. Falls back to a reasonable static
 * color if read before hydration (e.g. no window yet). */
function token(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function GoogleMap({ apiKey, center, stores, selectedId, onSelect }: { apiKey: string; center: LatLng; stores: StoreResult[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadMaps(apiKey)
      .then(() => {
        if (cancelled || !ref.current) return;
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(ref.current, { center, zoom: 12, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy" });
        } else {
          mapRef.current.setCenter(center);
        }
        for (const m of markersRef.current) m.setMap(null);
        markersRef.current = [];
        const success = token("--success", "#1f8a4c");
        const accent = token("--accent", "#566245");
        const accentDeep = token("--accent-deep", "#768563");
        const onAccent = token("--on-accent", "#fff");
        new google.maps.Marker({ position: center, map: mapRef.current, title: "You", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: success, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(center);
        stores.forEach((s, i) => {
          const isSelected = selectedId === s.id;
          // Numbered accent-colored pin (matches the list rows' badges below)
          // instead of the default red teardrop marker.
          const marker = new google.maps.Marker({
            position: s.location,
            map: mapRef.current,
            title: s.name,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: isSelected ? 15 : 12, fillColor: isSelected ? accentDeep : accent, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
            label: { text: String(i + 1), color: onAccent, fontSize: "11px", fontWeight: "700" },
          });
          marker.addListener("click", () => onSelect(s.id));
          markersRef.current.push(marker);
          bounds.extend(s.location);
        });
        if (stores.length) mapRef.current.fitBounds(bounds, 40);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiKey, center, stores, selectedId, onSelect]);

  return <div ref={ref} className="h-full w-full" role="region" aria-label="Map of nearby shops" />;
}
