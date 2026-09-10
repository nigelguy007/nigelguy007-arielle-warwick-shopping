import { timed } from "@/lib/logger";
import type { AlertNotification, Notifier, NotifyResult, NotifyTarget } from "./types";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function renderHtml(notifications: AlertNotification[]): string {
  const items = notifications.map((n) => `<li><strong>${escapeHtml(n.title)}</strong><br/>${escapeHtml(n.body)}</li>`).join("");
  return `<p>Here's what changed on your Warwick move-in checklist:</p><ul>${items}</ul><p style="color:#666;font-size:12px">Automated alert - prices and offers can change again by the time you check.</p>`;
}

/**
 * Resend (https://resend.com) adapter, called over its plain HTTP API - no SDK
 * dependency, same pattern as the Awin/SerpApi providers. Requires
 * RESEND_API_KEY and ALERT_EMAIL_FROM (a verified sending address); getNotifier()
 * falls back to ConsoleNotifier automatically when either is missing, exactly
 * like the other mock-fallback providers in this codebase.
 */
export class ResendEmailNotifier implements Notifier {
  readonly name = "resend";
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(target: NotifyTarget, notifications: AlertNotification[]): Promise<NotifyResult> {
    if (notifications.length === 0) return { channel: "resend", sent: false, reason: "nothing to send" };
    if (!target.email) return { channel: "resend", sent: false, reason: "no email on file for this user" };
    return timed("resend", "send", async () => {
      const subject = notifications.length === 1 ? notifications[0].title : `${notifications.length} shopping alerts for your Warwick move-in`;
      const res = await this.fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ from: this.from, to: [target.email], subject, html: renderHtml(notifications) }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      return { channel: "resend", sent: true };
    });
  }
}
