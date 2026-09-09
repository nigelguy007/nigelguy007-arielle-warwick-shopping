import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
      <WifiOff className="h-10 w-10 text-muted" />
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-muted">Your checklist still works. Reconnect to check current prices.</p>
      <Link href="/checklist" className="mt-2 rounded-2xl bg-accent px-5 py-3 font-semibold text-white">Open checklist</Link>
    </main>
  );
}
