import { test, expect } from "@playwright/test";
for (const width of [390, 1440]) {
  test(`videos are the default landing page and visitor controls stay private at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Learn in 1 minute." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate video", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Owner video studio")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Publish reviewed video" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "Browse all topics" }).click();
    await expect(page.getByPlaceholder("Search topics")).toBeVisible();
    await page.getByPlaceholder("Search topics").fill("React");
    await expect(page.locator(".topic-card").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate video", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "▶ Videos", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Learn in 1 minute." }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    await page.goto("/#home");
    const home = page.getByRole("region", {
      name: "Keep your curiosity going.",
    });
    await expect(home).toBeVisible();
    await expect(
      home.getByRole("button", { name: "Log in", exact: true }),
    ).toBeVisible();
    await home
      .getByRole("button", { name: "Create an account", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close account dialog" }).click();
    await home.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close account dialog" }).click();
    await home
      .getByRole("link", { name: "Watch the free video feed again →" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Learn in 1 minute." }),
    ).toBeVisible();
  });
}
