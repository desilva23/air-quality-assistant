import { axeViolations, expect, openDelhiFamily, test } from "./fixtures";

for (const colorScheme of ["light", "dark"] as const) {
  test(`passes every axe rule in the ${colorScheme} theme with a plan showing`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await openDelhiFamily(page);
    await page.getByRole("button", { name: "Build today's plan" }).click();
    await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
    await page.getByText("Show the hourly values as a table").click();
    expect(await axeViolations(page)).toEqual([]);
  });
}

test("reflows without horizontal scrolling at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openDelhiFamily(page);
  await page.getByRole("button", { name: "Build today's plan" }).click();
  await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the skip link is the first stop and lands on the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("every page gets a fresh nonce, and every script it serves carries it", async ({ page }) => {
  const nonces: string[] = [];
  for (let visit = 0; visit < 2; visit++) {
    const response = await page.goto("/");
    const policy = response?.headers()["content-security-policy"] ?? "";
    expect(policy).toMatch(/script-src 'self' 'nonce-[\w+/=]+' 'strict-dynamic'/);
    const nonce = /'nonce-([\w+/=]+)'/.exec(policy)?.[1] ?? "missing";
    const scripts = (await response?.text())?.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((tag) => !tag.includes(`nonce="${nonce}"`))).toEqual([]);
    nonces.push(nonce);
  }
  expect(nonces[0]).not.toBe(nonces[1]);
});

test("pages and API responses carry the browser security headers", async ({ page, request }) => {
  const expected = {
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "cross-origin-opener-policy": "same-origin",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  };
  const pageHeaders = (await page.goto("/"))?.headers();
  const apiHeaders = (await request.get("/api/health")).headers();
  for (const headers of [pageHeaders, apiHeaders]) expect(headers).toMatchObject(expected);
  expect(pageHeaders).not.toHaveProperty("x-powered-by");
  expect(apiHeaders["cache-control"]).toBe("no-store");
});

test("markup injected into the page can't run script", async ({ page, pageErrors }) => {
  await page.goto("/");
  // The usual cross-site scripting payloads, as if untrusted text reached the page as HTML.
  // (Scripts the page itself creates are trusted under 'strict-dynamic', so they aren't a test.)
  await page.evaluate(() => {
    const box = document.createElement("div");
    box.innerHTML = `<img src="data:," onerror="window.injected = 1"><iframe srcdoc="<script>parent.injected = 2</script>"></iframe>`;
    document.body.append(box);
  });
  await expect
    .poll(() => pageErrors.filter((e) => e.startsWith("CSP violation:")).sort())
    .toEqual([
      "CSP violation: script-src-attr blocked inline",
      "CSP violation: script-src-elem blocked inline",
    ]);
  expect(await page.evaluate(() => "injected" in window)).toBe(false);
  // Those refusals are the errors this test expects the page to log.
  pageErrors.length = 0;
});

test("API refuses other sites and invalid input with codes only", async ({ request }) => {
  const cross = await request.post("/api/plan", {
    headers: { origin: "https://evil.example", "content-type": "application/json" },
    data: {},
  });
  expect(cross.status()).toBe(403);
  expect(await cross.json()).toEqual({ error: "CROSS_SITE" });
  const invalid = await request.post("/api/plan", { data: { place: "nowhere" } });
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toEqual({ error: "INVALID_INPUT" });
  const outside = await request.get("/api/air?lat=51.5&lon=-0.12");
  expect(outside.status()).toBe(400);
  const health = await request.get("/api/health");
  expect(await health.json()).toEqual({ ok: true, ai: null, stations: false });
});
