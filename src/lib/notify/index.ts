import "server-only";
import { env } from "@/lib/env";
import { ConsoleNotifier } from "./console";
import { ResendEmailNotifier } from "./email";
import type { Notifier } from "./types";

export function getNotifier(): Notifier {
  if (env.emailProvider === "resend") return new ResendEmailNotifier(env.resendApiKey, env.alertEmailFrom);
  return new ConsoleNotifier();
}

export type { AlertKind, AlertNotification, Notifier, NotifyResult, NotifyTarget } from "./types";
