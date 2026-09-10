import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // iPhone-sized viewport on Chromium (WebKit is not installed in every environment).
    ...devices["iPhone 13"],
    browserName: "chromium",
    defaultBrowserType: "chromium",
    // Set PW_CHROMIUM_PATH to reuse a pre-installed Chromium instead of downloading one.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATA_MODE: "local",
      LOCAL_DATA_DIR: ".data/e2e",
      // Set LOCAL_STORE=cookie to run the same journey against the cookie-backed demo store.
      LOCAL_STORE: process.env.LOCAL_STORE ?? "file",
      PRODUCT_PROVIDER: "mock",
      MAP_PROVIDER: "mock",
      OFFER_PROVIDER: "mock",
      NEXT_PUBLIC_APP_URL: baseURL,
    },
  },
});
