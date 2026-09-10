import { log } from "@/lib/logger";
import type { AlertNotification, Notifier, NotifyResult, NotifyTarget } from "./types";

/**
 * Always available, no configuration needed - the same "mock adapter that always
 * works" pattern as the other providers in this app. Logs each notification as a
 * structured server log so it shows up in `pnpm dev` output and Vercel logs; this
 * is a genuine delivery channel for local/demo use, not a silent no-op.
 */
export class ConsoleNotifier implements Notifier {
  readonly name = "console";

  async send(target: NotifyTarget, notifications: AlertNotification[]): Promise<NotifyResult> {
    if (notifications.length === 0) return { channel: "console", sent: false, reason: "nothing to send" };
    for (const n of notifications) {
      log.info("alert.notify.console", { userId: target.userId, kind: n.kind, title: n.title, body: n.body, ...n.meta });
    }
    return { channel: "console", sent: true };
  }
}
