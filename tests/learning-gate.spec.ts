import { test, expect } from "@playwright/test";
const categories = [
  "Front End Coding",
  "Back End Coding",
  "Database Layer Coding",
  "Software Architecture",
  "Refactoring",
  "Security Coding",
  "Law",
  "Medical",
  "Research",
  "Finance",
];
for (const width of [1440, 390])
  test(`category picks and account gates at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/#builder");
    await page.getByRole("button", { name: "Top 10 by category" }).click();
    for (const name of categories) {
      await page
        .getByLabel("Model recommendation category")
        .selectOption({ label: name });
      await expect(page.getByTestId("category-model")).toHaveCount(10);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await expect(
      page.getByText(/Not investment, tax or financial advice/),
    ).toBeVisible();
    await page
      .getByTestId("category-model")
      .first()
      .getByRole("link", { name: "Learn", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Welcome back");
    await page.getByRole("button", { name: "Create an account" }).click();
    await expect(page.getByRole("dialog")).toContainText("Create your account");
    await page.keyboard.press("Escape");
    await page.goto("/");
    await page
      .locator(".topic-card")
      .first()
      .getByRole("button", { name: "Take assessment" })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Welcome back");
    await expect(page.locator(".exam-card")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page
      .locator(".topic-card")
      .first()
      .getByRole("link", { name: "Learn" })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Welcome back");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("generated learning page assessment CTA requires an account", async ({
  page,
}) => {
  await page.goto("/learn/ai_qwen_qwen3_coder_480b_a35b_instruct/");
  await page.getByRole("link", { name: "Take an assessment" }).click();
  await expect(page.getByRole("dialog")).toContainText("Welcome back");
  await expect(page).toHaveURL(/#login\?assessment=ai_qwen/);
});
