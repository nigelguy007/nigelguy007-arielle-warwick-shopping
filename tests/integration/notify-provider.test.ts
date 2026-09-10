import { describe, expect, it } from "vitest";
import { ConsoleNotifier } from "@/lib/notify/console";
import { ResendEmailNotifier } from "@/lib/notify/email";
import type { AlertNotification } from "@/lib/notify/types";

const notification: AlertNotification = {
  kind: "price_drop",
  title: "Price drop: Kettle",
  body: "Argos now has \"Kettle\" for GBP 15.00, down from GBP 20.00 last checked (save GBP 5.00).",
  meta: { retailer: "Argos", previousPrice: 20, currentPrice: 15, saving: 5, productUrl: null },
};

describe("ConsoleNotifier", () => {
  it("always reports sent when there is something to send", async () => {
    const result = await new ConsoleNotifier().send({ userId: "u1", email: null }, [notification]);
    expect(result).toEqual({ channel: "console", sent: true });
  });
  it("does not claim delivery for an empty batch", async () => {
    const result = await new ConsoleNotifier().send({ userId: "u1", email: null }, []);
    expect(result.sent).toBe(false);
  });
});

describe("ResendEmailNotifier (mocked HTTP)", () => {
  const fakeFetch: typeof fetch = async (input, init) => {
    expect(String(input)).toBe("https://api.resend.com/emails");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(String(init?.body));
    expect(body.from).toBe("alerts@example.com");
    expect(body.to).toEqual(["arielle@example.com"]);
    expect(body.subject).toBe("Price drop: Kettle");
    expect(body.html).toContain("Price drop: Kettle");
    return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
  };

  it("sends via the Resend API when an email is on file", async () => {
    const result = await new ResendEmailNotifier("re_test_key", "alerts@example.com", fakeFetch).send({ userId: "u1", email: "arielle@example.com" }, [notification]);
    expect(result).toEqual({ channel: "resend", sent: true });
  });

  it("never fabricates delivery when there is no email on file", async () => {
    const neverCalled: typeof fetch = async () => {
      throw new Error("should not have called fetch");
    };
    const result = await new ResendEmailNotifier("re_test_key", "alerts@example.com", neverCalled).send({ userId: "u1", email: null }, [notification]);
    expect(result).toEqual({ channel: "resend", sent: false, reason: "no email on file for this user" });
  });

  it("throws on an HTTP error so the caller can record it rather than silently drop the alert", async () => {
    const bad: typeof fetch = async () => new Response("nope", { status: 500 });
    await expect(new ResendEmailNotifier("re_test_key", "alerts@example.com", bad).send({ userId: "u1", email: "arielle@example.com" }, [notification])).rejects.toThrow(/500/);
  });

  it.runIf(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_FROM)("LIVE: sends a real email", async () => {
    const result = await new ResendEmailNotifier(process.env.RESEND_API_KEY as string, process.env.ALERT_EMAIL_FROM as string).send({ userId: "u1", email: process.env.ALERT_EMAIL_FROM as string }, [notification]);
    expect(result.sent).toBe(true);
  });
});
