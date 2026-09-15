import { expect, type Page } from "@playwright/test";

/** Local mode has no sign-in; "signing in" means landing on the app and completing onboarding. */
export async function signInAndOnboard(page: Page, opts: { budget?: number } = {}) {
  // In local (demo) mode /login sends an already-signed-in user straight to the app.
  await page.goto("/login");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  if (page.url().includes("/onboarding")) {
    await expect(page.getByRole("heading", { name: /First, a bit about you/ })).toBeVisible();
    // The university/name fields start empty (only placeholder text) - fill
    // them in rather than relying on a default value, which used to
    // silently default every new student to Warwick.
    await page.getByLabel("Your name").fill("Arielle");
    await page.getByLabel("University", { exact: true }).fill("University of Warwick");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: /Let's get .* ready for/ })).toBeVisible();
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByLabel("I agree to the terms and privacy notice").check();
    await page.getByRole("button", { name: "Accept & continue" }).click();
    await page.getByRole("button", { name: "Bluebell" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    if (opts.budget) {
      await page.getByRole("button", { name: `£${opts.budget}`, exact: true }).click();
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page.getByRole("button", { name: "Use Warwick campus" }).click();
  }
  await expect(page.getByRole("heading", { name: /Hi / })).toBeVisible();
}

export async function resetOnboarding(page: Page) {
  // Home redirects to onboarding only once; force a fresh run via the API.
  await page.request.post("/api/profile", { data: { onboardingComplete: false } });
}
