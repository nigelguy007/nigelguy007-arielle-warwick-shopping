import { expect, test } from "@playwright/test";
import { signInAndOnboard, resetOnboarding } from "./helpers";

test.describe.configure({ mode: "serial" });

test("1-2: sign in and complete onboarding", async ({ page }) => {
  await resetOnboarding(page);
  await signInAndOnboard(page, { budget: 200 });
  await expect(page.getByText("Budget left")).toBeVisible();
  await expect(page.getByText("£200.00", { exact: true })).toBeVisible();
  await expect(page.getByText(/Bluebell/).first()).toBeVisible();
});

test("3: full checklist is present with filters", async ({ page }) => {
  await signInAndOnboard(page);
  await page.getByRole("link", { name: "Checklist" }).click();
  await expect(page.getByRole("heading", { name: "Checklist" })).toBeVisible();
  await expect(page.getByText(/77 of 77 items/)).toBeVisible();
  await page.getByRole("button", { name: "Essentials" }).click();
  await expect(page.getByText(/of 77 items/)).toBeVisible();
  await expect(page.getByText("Duvet", { exact: true })).toBeVisible();
});

test("4-5: search a duvet, compare options, add to basket, find nearby", async ({ page }) => {
  await signInAndOnboard(page);
  await page.goto("/shop");
  await page.getByLabel("Search products").fill("duvet");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText(/Results for “duvet”/)).toBeVisible();
  await expect(page.getByText("Cheapest").first()).toBeVisible();
  await expect(page.getByText("Best value").first()).toBeVisible();
  await expect(page.getByText(/Source:/).first()).toBeVisible();
  await expect(page.getByText(/Checked (just now|\d+ minutes? ago)/).first()).toBeVisible();
  await expect(page.getByText("Mock data · not live").first()).toBeVisible();
  // Bluebell's bed size (small double) is verified, so shown results are the small
  // double duvets and no "unconfirmed" guessing warning appears (single/double
  // duvets are correctly excluded instead - see the "Excluded" panel below).
  await expect(page.getByText("Small Double 10.5 Tog Duvet")).toBeVisible();
  await expect(page.getByText(/Bed size not confirmed/)).toHaveCount(0);

  await page.getByRole("button", { name: "Add to basket" }).first().click();
  await expect(page.getByText(/Added .* to your basket/)).toBeVisible();
  await expect(page.getByText(/1 shop · 1 item/)).toBeVisible();

  await page.getByRole("button", { name: "Find nearby" }).first().click();
  await expect(page).toHaveURL(/\/map\?retailer=/);
  await expect(page.getByRole("heading", { name: "Map" })).toBeVisible();
});

test("6-7: location via campus, nearby stores never claim stock", async ({ page }) => {
  await signInAndOnboard(page);
  await page.goto("/map");
  await page.getByRole("button", { name: "Warwick campus" }).click();
  await expect(page.getByText("University of Warwick, Coventry CV4 7AL")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Maps" }).first()).toBeVisible();
  await expect(page.getByText(/This does not confirm the item is in stock here/).first()).toBeVisible();
  await page.getByRole("button", { name: "Argos", exact: true }).click();
  await expect(page.getByText(/Argos Coventry/).first()).toBeVisible();
});

test("8-10: mark bought from basket, mark packed, budget updates", async ({ page }) => {
  await signInAndOnboard(page, { budget: 200 });
  // Self-contained: put a duvet in the basket first (each test has its own browser context).
  await page.goto("/shop?q=duvet");
  await page.getByRole("button", { name: "Add to basket" }).first().click();
  await expect(page.getByText(/1 shop · 1 item/)).toBeVisible();
  await page.goto("/shop"); // basket only, no search results
  const before = await page.request.get("/api/budget").then((r) => r.json());
  await page.getByRole("button", { name: "Mark bought" }).first().click();
  await expect(page.getByText("Your basket is empty")).toBeVisible();
  const after = await page.request.get("/api/budget").then((r) => r.json());
  expect(after.summary.spent).toBeGreaterThan(before.summary.spent);
  expect(after.summary.remaining).toBeLessThan(before.summary.remaining);

  await page.goto("/checklist?filter=bought");
  await page.getByRole("link", { name: /Open Duvet/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Duvet", exact: true })).toBeVisible();
  await expect(page.getByText("Status · Bought")).toBeVisible();
  await page.getByRole("button", { name: "Packed" }).click();
  await expect(page.getByText("Status · Packed")).toBeVisible();

  await page.goto("/me");
  await expect(page.getByTestId("budget-spent")).not.toHaveText("£0.00");
  await expect(page.getByTestId("budget-remaining")).toContainText("£");
});

test("agent answers simple questions in rule mode", async ({ page }) => {
  await signInAndOnboard(page);
  await page.goto("/agent");
  await page.getByRole("button", { name: "What haven't I packed?" }).click();
  await expect(page.getByText(/Not packed yet/)).toBeVisible({ timeout: 15_000 });
});

test("vouchers show source, expiry and terms; student links never verified", async ({ page }) => {
  await signInAndOnboard(page);
  await page.goto("/shop?offers=Dunelm");
  await expect(page.getByText("10% off bedding (mock)")).toBeVisible();
  await expect(page.getByText(/Ends in \d+ days/).first()).toBeVisible();
  await expect(page.getByText(/Min spend £20/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Check student discount" }).first()).toBeVisible();
  await expect(page.getByText("Student verification needed").first()).toBeVisible();
});

test("PWA manifest and service worker are served", async ({ page }) => {
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const json = await manifest.json();
  expect(json.display).toBe("standalone");
  expect(json.icons.length).toBeGreaterThanOrEqual(3);
  const sw = await page.request.get("/sw.js");
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain("NEVER_CACHE");
  const health = await page.request.get("/api/health").then((r) => r.json());
  expect(health.ok).toBe(true);
  expect(health.providers.product).toBe("mock");
});
