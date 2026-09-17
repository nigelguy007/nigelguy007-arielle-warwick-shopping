import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/client/theme";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

// One bold geometric sans for everything, per the approved Stitch reference.
const display = Inter({ subsets: ["latin"], variable: "--font-display-raw", display: "swap" });

export const metadata: Metadata = {
  title: { default: "UniKit", template: "%s · UniKit" },
  description: "Arielle, your university move-in shopping agent: checklist, prices, nearby shops and budget - for any UK university.",
  applicationName: "UniKit",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "UniKit" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1214" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`h-full antialiased ${display.variable}`}>
      <head>
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
