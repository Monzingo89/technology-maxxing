import { test, expect } from "@playwright/test";

for (const legalPage of [
  { path: "/privacy-policy/", heading: "Privacy Policy" },
  { path: "/terms-of-service/", heading: "Terms of Service" },
]) {
  test(`${legalPage.heading} has a direct public route`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto(legalPage.path);

    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole("heading", { name: legalPage.heading, exact: true }),
    ).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(`^${legalPage.heading}`));
    await expect(
      page.getByRole("link", { name: "Back to library" }),
    ).toHaveAttribute("href", "/#library");
    expect(errors).toEqual([]);
  });
}

test("site footer links to the direct legal routes", async ({ page }) => {
  await page.goto("/");

  const legal = page.getByRole("navigation", { name: "Legal" });
  await expect(
    legal.getByRole("link", { name: "Privacy Policy" }),
  ).toHaveAttribute("href", "/privacy-policy/");
  await expect(
    legal.getByRole("link", { name: "Terms of Service" }),
  ).toHaveAttribute("href", "/terms-of-service/");
});
