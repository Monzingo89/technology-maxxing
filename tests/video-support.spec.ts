import { test, expect } from "@playwright/test";
for (const width of [390, 1440]) {
  test(`support page explains cost and screens shoutout previews at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#support");
    await expect(page.getByRole("heading", { name: "Keep the next minute free." })).toBeVisible();
    await expect(page.getByText("About $6", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Contributions aren’t open yet" })).toBeDisabled();
    const alias = page.getByLabel("Preview a supporter alias");
    await alias.fill("sam1989");
    await expect(page.locator(".support-preview")).toContainText("Thanks to sam1989.");
    await page.getByRole("checkbox").check();
    await alias.fill("sh1thead");
    await expect(page.locator(".support-preview")).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toBeDisabled();
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
