import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { OfflineBanner } from "@/components/pwa/offline-banner";

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
  themeColor: "#FF4F1F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full">
        <OfflineBanner />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
