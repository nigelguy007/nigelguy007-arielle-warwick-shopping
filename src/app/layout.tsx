import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/client/theme";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

// Display/headers only, per the design handoff - body/UI text uses the
// system font stack (set in globals.css), not a second webfont.
const display = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display-raw", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Warwick Move-In", template: "%s · Warwick Move-In" },
  description: "Arielle's Warwick move-in shopping agent: checklist, prices, nearby shops and budget.",
  applicationName: "Warwick Move-In",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Warwick Move-In" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#080e14" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`h-full antialiased ${display.variable}`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <OfflineBanner />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
