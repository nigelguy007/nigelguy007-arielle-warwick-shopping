import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

// Big Shoulders: designed around Chicago fire-escape stencils and industrial
// signage - a genuine "shipping manifest / crate stencil" face, not a reflex
// display pick. Hanken Grotesk: warm, humanist body face with good mobile
// legibility, distinct from the previous pass's Karla.
const display = Big_Shoulders({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display-raw", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body-raw", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#f2eae0" },
    { media: "(prefers-color-scheme: dark)", color: "#10141b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`h-full antialiased ${display.variable} ${body.variable}`}>
      <body className="min-h-full">
        <OfflineBanner />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
