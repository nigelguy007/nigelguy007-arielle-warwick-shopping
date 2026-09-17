import type { Metadata, Viewport } from "next";
import { Literata } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/client/theme";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

// Display/headers only - body/UI text uses the system font stack (set in
// globals.css), not a second webfont. Literata per the Stitch sage design
// system's serif editorial headlines.
const display = Literata({ subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"], variable: "--font-display-raw", display: "swap" });

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
