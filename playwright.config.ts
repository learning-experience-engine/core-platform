import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/content-studio/e2e",
  testMatch: /.*\.spec\.ts/,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ],
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4174",
    cwd: "./apps/content-studio",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
