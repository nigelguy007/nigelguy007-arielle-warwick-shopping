import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function gbp(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

export function km(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "";
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function agoLabel(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Checked time unknown";
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 1) return "Checked just now";
  if (mins < 60) return `Checked ${mins} minute${mins === 1 ? "" : "s"} ago`;
  const h = Math.round(mins / 60);
  return `Checked ${h} hour${h === 1 ? "" : "s"} ago`;
}
