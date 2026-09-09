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
        new google.maps.Marker({ position: center, map: mapRef.current, title: "You", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#1f8a4c", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(center);
        for (const s of stores) {
          const marker = new google.maps.Marker({ position: s.location, map: mapRef.current, title: s.name, label: selectedId === s.id ? { text: "●", color: "#ff4f1f" } : undefined });
          marker.addListener("click", () => onSelect(s.id));
          markersRef.current.push(marker);
          bounds.extend(s.location);
        }
        if (stores.length) mapRef.current.fitBounds(bounds, 40);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiKey, center, stores, selectedId, onSelect]);

  return <div ref={ref} className="h-72 w-full rounded-[var(--radius-card)] bg-black/5" role="region" aria-label="Map of nearby shops" />;
}
