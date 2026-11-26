import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${String(port)}`;

/** Browser tests against the production build. `npm run test:e2e` builds first. */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/serve.mjs",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      // Blank rather than unset, so keys in .env.local aren't loaded either:
      // the tests use the built-in plan, which is deterministic and free.
      GROQ_API_KEY: "",
      OPENAQ_API_KEY: "",
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
    },
  },
});
