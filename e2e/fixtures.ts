import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";
import { DAY_VALUES, outlookFrom, report } from "../tests/support/fixtures";

/** Collects console errors, uncaught exceptions and Content-Security-Policy violations. */
async function watchForErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(`CSP violation: ${event.effectiveDirective} blocked ${event.blockedURI}`);
    });
  });
  return errors;
}

/** Every test fails if its page logged an error. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors = await watchForErrors(page);
      await use(errors);
      expect(errors, "errors logged by the page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** A 1×1 transparent PNG. */
const BLANK_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Live air depends on outside services, so browser tests answer the two data
 * endpoints with fixed data. The plan and question endpoints run for real,
 * with AI off, so the built-in guidance is what renders.
 */
export async function stubAirData(page: Page): Promise<void> {
  await page.route("**/api/air?*", (route) =>
    route.fulfill({ json: report({ outlook: outlookFrom(DAY_VALUES) }) }),
  );
  await page.route("**/api/stations?*", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        stations: [
          {
            name: "ITO, Delhi - CPCB",
            latitude: 28.63,
            longitude: 77.24,
            distanceKm: 3.2,
            pm25: 182,
            measuredAt: "2026-11-25T18:15:00Z",
          },
          {
            name: "Lodhi Road, Delhi - IMD",
            latitude: 28.59,
            longitude: 77.22,
            distanceKm: 2.4,
            pm25: 108,
            measuredAt: "2026-11-25T18:00:00Z",
          },
        ],
      },
    }),
  );
  // Map tiles come from OpenStreetMap; tests serve a blank tile so they never depend on it.
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: BLANK_TILE }),
  );
  await page.route("**/api/places?*", (route) =>
    route.fulfill({
      json: {
        places: [{ name: "Noida", region: "Uttar Pradesh", latitude: 28.58, longitude: 77.33 }],
      },
    }),
  );
}

/** Loads the page with stubbed data and picks the Delhi family sample. */
export async function openDelhiFamily(page: Page): Promise<void> {
  await stubAirData(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Delhi family/ }).click();
  await expect(page.getByRole("heading", { name: "Air in New Delhi now" })).toBeVisible();
  await expect(page.getByText("323", { exact: true })).toBeVisible();
}

/** Every axe rule, including colour contrast and landmarks, which jsdom can't check. */
export async function axeViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
  );
}
