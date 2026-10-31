import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout sur la démo construite (vite preview) : parcours clés, accessibilité (axe),
 * absence de débordement horizontal sur téléphone. `npm run e2e` (après `npm run build:demo`).
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4173", locale: "fr-FR", timezoneId: "Africa/Dakar", trace: "retain-on-failure" },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
    { name: "telephone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npx vite preview --port 4173 --strictPort", port: 4173, reuseExistingServer: true, timeout: 60_000 },
});
