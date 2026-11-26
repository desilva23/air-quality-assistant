import { axeViolations, expect, openDelhiFamily, stubAirData, test } from "./fixtures";

test("a family gets live air, a personal plan with impacts, and an answer", async ({ page }) => {
  await openDelhiFamily(page);
  await expect(page.getByText("OpenAQ (CPCB)")).toBeVisible();
  await expect(page.getByText("ITO, Delhi, 3.2 km away", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Children under 12")).toBeChecked();

  await page.getByRole("button", { name: "Build today's plan" }).click();
  const headline = page.getByRole("heading", {
    level: 3,
    name: /Very poor air in New Delhi today/,
  });
  await expect(headline).toBeFocused();
  await expect(page.getByText(/AI isn't switched on for this server/)).toBeVisible();
  await expect(page.getByText(/cuts the PM2.5 you breathe during it by about 67%/)).toBeVisible();
  await expect(page.getByText(/saves about 19 kg of CO₂ and ₹880 of petrol a week/)).toBeVisible();

  await page.getByRole("button", { name: "Can my kids play outside this evening?" }).click();
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/here is today's general guidance/)).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test("two households in the same city get different plans", async ({ page }) => {
  await openDelhiFamily(page);
  await page.getByRole("button", { name: "Build today's plan" }).click();
  await expect(
    page.getByText(
      "Move the children's outdoor play to the cleaner hour below, or do it indoors.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();

  await page.getByLabel("Children under 12").uncheck();
  await page.getByLabel("How you usually travel").selectOption({ label: "Scooter or motorbike" });
  await page.getByLabel("Main outdoor activity").selectOption({ label: "Run or jog" });
  await page.getByLabel("Usually in the").selectOption({ label: "Morning" });
  await expect(page.getByText(/changed since this plan was made/)).toBeVisible();
  await page.getByRole("button", { name: "Build today's plan" }).click();
  await expect(
    page.getByText("Wear a well-fitted N95 for the ride in.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Move the run to the cleaner hour below, or do it indoors.", { exact: true }),
  ).toBeVisible();
});

test("a town can be found by name, and answers are remembered on reload", async ({ page }) => {
  await stubAirData(page);
  await page.goto("/");
  await page.getByLabel("Town or city").fill("Noida");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "Noida, Uttar Pradesh" }).click();
  await expect(page.getByRole("heading", { name: "Air in Noida now" })).toBeVisible();
  await page.getByLabel("Adults over 60").check();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Air in Noida now" })).toBeVisible();
  await expect(page.getByLabel("Adults over 60")).toBeChecked();
});

test("the extra panels show nearby stations, a what-if and every way to commute", async ({
  page,
}) => {
  await openDelhiFamily(page);
  await expect(page.getByRole("rowheader", { name: "ITO, Delhi - CPCB" })).toBeVisible();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(3);
  await page
    .getByRole("region", { name: /Map of nearby monitoring stations/ })
    .scrollIntoViewIfNeeded();

  const choices = page.locator(".choices-card");
  await choices.getByLabel("Mask you usually wear outside").selectOption({ label: "N95 or FFP2" });
  await expect(choices.getByText(/^These choices cut your dose by/)).toBeVisible();

  await expect(page.getByRole("rowheader", { name: "Car (yours)" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "₹880" })).toBeVisible();
});
