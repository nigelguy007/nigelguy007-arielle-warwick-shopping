"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-50 flex items-center gap-2 bg-warn-soft px-4 py-2 text-sm font-medium text-warn" style={{ paddingTop: "calc(var(--sat) + 0.5rem)" }}>
      <WifiOff className="h-4 w-4" /> You&apos;re offline. Your checklist still works; reconnect to check current prices.
    </div>
  );
}
