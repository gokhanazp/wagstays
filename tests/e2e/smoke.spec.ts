import { expect, test, type Page } from "@playwright/test";

// Anonymous, read-only checks: every public page answers 200 and logs no console errors.
const PAGES = ["/", "/sitters", "/become-a-sitter", "/login", "/terms", "/pet-sitters/toronto"];

function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

/** Parses every JSON-LD block on the page and returns the schema.org types found. */
async function jsonLdTypes(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text);
    return (Array.isArray(data) ? data : [data]).map((d: { "@context"?: string; "@type"?: string }) => {
      expect(d["@context"]).toBe("https://schema.org");
      return d["@type"];
    });
  });
}

for (const path of PAGES) {
  test(`${path} renders without console errors`, async ({ page }) => {
    const errors = trackConsole(page);
    const res = await page.goto(path, { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await jsonLdTypes(page)).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
    expect(errors).toEqual([]);
  });
}

test("a sitter profile renders with structured data", async ({ page }) => {
  const errors = trackConsole(page);
  await page.goto("/sitters", { waitUntil: "networkidle" });
  const href = await page.locator('a[href^="/sitters/"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  const res = await page.goto(href!, { waitUntil: "networkidle" });
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
  expect(await jsonLdTypes(page)).toEqual(expect.arrayContaining(["LocalBusiness", "BreadcrumbList"]));
  expect(errors).toEqual([]);
});

test("sitemap.xml lists public pages", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("<urlset");
  expect(xml).toMatch(/<loc>[^<]+\/sitters<\/loc>/);
  expect(xml).not.toMatch(/\/(admin|account|messages|book)\b/);
});

test("robots.txt blocks private areas and points to the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const txt = await res.text();
  for (const p of ["/admin", "/account", "/messages", "/book", "/api", "/auth"]) expect(txt).toContain(`Disallow: ${p}`);
  expect(txt).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});
