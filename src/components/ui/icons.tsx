/**
 * Hand-drawn inline icon paths copied exactly from the design handoff's
 * prototype (no icon library dependency, per the handoff's Assets section).
 * All are viewBox 0 0 24 24, stroke-linecap/linejoin round unless noted.
 */
import type { SVGProps } from "react";

function Line({ d, size = 20, sw = 1.8, hydrationSensitive, ...props }: { d: string; size?: number; sw?: number; hydrationSensitive?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {/* suppressHydrationWarning: only set true for icons whose path is
          allowed to legitimately differ between server and client render
          (e.g. the dark-mode toggle, which depends on system preference
          that SSR can't know) - see dark-toggle-button.tsx. */}
      <path d={d} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" suppressHydrationWarning={hydrationSensitive} />
    </svg>
  );
}

export const TAB_ICON_PATH = {
  home: "M4 11l8-7 8 7v9h-6v-6h-4v6H4v-9Z",
  checklist: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  shop: "M6 8h12l-1 12H7L6 8ZM9 8V6a3 3 0 0 1 6 0v2",
  map: "M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10Z",
  me: "M12 4a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 4ZM4 21a8 8 0 0 1 16 0",
} as const;

export const CATEGORY_ICON_PATH: Record<string, string> = {
  Bedding: "M4 17v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M4 17v2m16-2v2M6 11V7a2 2 0 0 1 2-2h3v6",
  Kitchen: "M5 10h14v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-7ZM3 10h18M9 10V7m6 3V7",
  Bathroom: "M12 4v4M6 12h12M8 16v2M12 16v2M16 16v2",
  Electronics: "M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0V8ZM12 18v3",
  // Extended to cover the app's real 12 categories (the handoff's prototype
  // only seeded 4 as demo data) - drawn in the same minimal line-icon style.
  Laundry: "M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 4v2M16 4v2M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  Study: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z",
  Clothing: "M9 3l3 2 3-2 4 3-2 3-2-1v11H8V8l-2 1-2-3 4-3Z",
  Health: "M12 6v12M6 12h12M6 5a3 3 0 0 0-3 3v1a4 4 0 0 0 4 4h1v3a3 3 0 0 0 6 0v-3h1a4 4 0 0 0 4-4V8a3 3 0 0 0-3-3",
  Admin: "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM9 8h6M9 12h6M9 16h3",
  Room: "M4 21V9l8-6 8 6v12M14 21v-6h-4v6",
  Cleaning: "M9 3l1 3-4 12a2 2 0 0 0 2 2.5h0a2 2 0 0 0 2-1.5l3-12M14 3l6 6M17 6l-9 9",
  Food: "M6 3v7a2 2 0 0 0 4 0V3M8 10v11M18 3c-2 0-3 2-3 5s1 5 3 5v8",
} as const;

export const CHECKLIST_STATUS_ICON = {
  check: "M5 12l5 5 9-10",
  packed: "M6 8h12l-1 12H7L6 8ZM9 8V6a3 3 0 0 1 6 0v2",
  skip: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13",
} as const;

export const MISC_ICON_PATH = {
  back: "M15 6l-6 6 6 6",
  chevronDown: "M6 9l6 6 6-6",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2Z M10 20a2 2 0 0 0 4 0",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z",
} as const;

export function Icon({ path, size = 20, sw = 1.8, className, hydrationSensitive }: { path: string; size?: number; sw?: number; className?: string; hydrationSensitive?: boolean }) {
  return <Line d={path} size={size} sw={sw} className={className} hydrationSensitive={hydrationSensitive} />;
}

export function CheckIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return <Line d={CHECKLIST_STATUS_ICON.check} sw={3} {...props} />;
}

export function SparkleIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z" fill="currentColor" />
    </svg>
  );
}

export function SpinnerIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={{ animation: "spin 0.9s linear infinite" }}>
      <circle cx="12" cy="12" r="9" stroke="var(--row-border)" strokeWidth={2.5} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}
