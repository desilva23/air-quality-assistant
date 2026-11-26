import { expect, openDelhiFamily, test } from "./fixtures";

// Regenerates the README screenshots from the production build: `npx playwright test screenshots`.
const SHOTS = "docs/screenshots";

test.use({ viewport: { width: 1000, height: 900 } });

test("screenshots for the README", async ({ page }) => {
  await openDelhiFamily(page);
  await page.getByRole("heading", { name: "2. Air in New Delhi now" }).scrollIntoViewIfNeeded();
  // Keep the pointer off the chart, so the readout shows the cleanest hour.
  await page.mouse.move(0, 0);
  await page
    .locator("section")
    .nth(1)
    .screenshot({ path: `${SHOTS}/live-air.jpg`, quality: 70 });

  await page.getByRole("button", { name: "Build today's plan" }).click();
  const plan = page.locator(".plan");
  await expect(plan).toBeVisible();
  await plan.screenshot({ path: `${SHOTS}/plan.jpg`, quality: 45 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText("323", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/mobile.jpg`, quality: 70 });
});
