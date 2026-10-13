import { test, expect } from "@playwright/test";
for (const width of [1440, 390]) test(`main model menu replaces navigation and fetches category metadata at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  const requested: string[] = [];
  await page.route("https://huggingface.co/api/models/**", route => {
    const id = decodeURIComponent(route.request().url().split("/api/models/")[1]);
    requested.push(id);
    return route.fulfill({ json: { id, downloads: 12345, likes: 123, pipeline_tag: "text-generation", cardData: { license: "apache-2.0" }, lastModified: "2026-10-13T00:00:00Z" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Top 10 Models", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Model categories" });
  await expect(menu.getByRole("button")).toHaveCount(11);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  expect(requested.length).toBe(0);
  await menu.getByRole("button", { name: "Front End Coding", exact: true }).click();
  await expect(page.getByTestId("hub-metadata")).toHaveCount(10);
  expect(requested.length).toBe(10);
  await expect(page.getByTestId("hub-metadata").first()).toContainText("12,345");
  await expect(page).toHaveURL(/#models\?category=front-end/);
  await page.reload();
  await expect(menu.getByRole("button", { name: "Front End Coding" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("hub-metadata")).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await menu.getByRole("button", { name: "Back to main menu" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
});
test("Hub failures retain clearly labeled saved recommendations and offer retry", async ({ page }) => {
  await page.route("https://huggingface.co/api/models/**", route => route.fulfill({ status: 429, body: "Limited" }));
  await page.goto("/#models?category=medical");
  await expect(page.getByTestId("category-model")).toHaveCount(10);
  await expect(page.getByTestId("category-model").first()).toContainText("Hugging Face rate limit");
  await expect(page.getByTestId("category-model").first()).toContainText("no live metrics available");
  await expect(page.getByRole("button", { name: "Retry unavailable metadata" })).toBeVisible();
});
