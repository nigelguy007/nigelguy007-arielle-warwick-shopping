"use client";
import { useEffect } from "react";
import { flushQueue } from "@/lib/client/offline-queue";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const onOnline = () => {
      flushQueue().catch(() => undefined);
    };
    window.addEventListener("online", onOnline);
    flushQueue().catch(() => undefined);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
