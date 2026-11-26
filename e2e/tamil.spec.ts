import { axeViolations, expect, stubAirData, test } from "./fixtures";

test("the whole journey works in Tamil and passes every axe rule", async ({ page }) => {
  await stubAirData(page);
  await page.goto("/");
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "தமிழ்" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("உங்கள் குடும்பத்துக்கான");
  await expect(page.locator(".app")).toHaveAttribute("lang", "ta");

  await page.getByRole("button", { name: /சென்னைக் குடும்பம்/ }).click();
  await expect(page.getByText("323", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "இன்றைய திட்டத்தை உருவாக்கு" }).click();
  await expect(page.getByRole("heading", { level: 3 })).toContainText("மிகவும் மோசம்");
  await expect(page.getByText(/கூடுதல் கவனம்/).first()).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("உங்கள் குடும்பத்துக்கான");
  await page.screenshot({ path: "test-results/tamil.png", fullPage: true });
});
