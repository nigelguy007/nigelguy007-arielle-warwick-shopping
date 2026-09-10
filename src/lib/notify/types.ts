export type AlertKind = "price_drop" | "voucher_expiry";

/**
 * One thing worth telling a user about. `meta` carries the numbers/ids behind the
 * copy so tests and future UI can check them without parsing `body` - and so no
 * notifier can silently invent a figure that isn't in `meta`.
 */
export interface AlertNotification {
  kind: AlertKind;
  title: string;
  body: string;
  meta: Record<string, string | number | boolean | null>;
}

export interface NotifyTarget {
  userId: string;
  /** Null when no verified delivery address is known (local demo mode, or no email on file) - never fabricated. */
  email: string | null;
}

export interface NotifyResult {
  channel: string;
  sent: boolean;
  reason?: string;
}

/** A place to deliver alerts. Implementations must never throw away a notification silently - return why, or send it. */
export interface Notifier {
  readonly name: string;
  send(target: NotifyTarget, notifications: AlertNotification[]): Promise<NotifyResult>;
}
