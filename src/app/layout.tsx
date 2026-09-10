import type { Metadata, Viewport } from "next";
import { Oswald, Karla } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-raw", display: "swap" });
const body = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body-raw", display: "swap" });

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
  themeColor: "#EFE6D8",
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
