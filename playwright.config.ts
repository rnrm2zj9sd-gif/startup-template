import { defineConfig, devices } from "@playwright/test";
import { chargerEnv } from "./e2e/helpers";

chargerEnv();

const baseURL = "http://localhost:3100";

function envServeur(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(process.env)) {
    if (typeof valeur === "string") env[cle] = valeur;
  }
  return env;
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: process.env.CI ? "pnpm build && pnpm start --port 3100" : "pnpm dev --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: envServeur(),
  },
});
