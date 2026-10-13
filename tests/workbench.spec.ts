import { test, expect } from "@playwright/test";
test("desktop: builds a 70B proposal, compares hardware, and exposes truthful checkout", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#builder");
  await page.getByRole("button", { name: "70B + media" }).click();
  await page.locator(".wb-build-button").click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(page.locator(".wb-result-heading")).toContainText(
    "Llama 3.3 70B",
  );
  await expect(page.locator(".wb-notes")).toContainText(
    "does not imply native",
  );
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("link", { name: /Compare tradeoffs/ }).click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("heading", { name: "Know your compute." }),
  ).toBeVisible();
  await popup.close();
  await page.getByRole("button", { name: "Review entire workstation" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No items have been added to an external cart",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("model atlas: valid Astra settings, token estimate and benchmark evidence", async ({
  page,
}) => {
  await page.goto("/#builder");
  await page.getByRole("button", { name: "Model atlas" }).click();
  await page
    .getByRole("textbox", { name: "Search workbench catalog" })
    .fill("GPT-6 Astra");
  await page.getByRole("button", { name: /Versions & evidence/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Terminal-Bench 4.0");
  await page.getByLabel("Reasoning", { exact: true }).selectOption("low");
  await page.getByLabel("Service tier").selectOption("Fast");
  await expect(page.locator(".wb-cost")).toContainText("$0.4000");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Plugins & skills" }).click();
  await page
    .getByRole("textbox", { name: "Search workbench catalog" })
    .fill("Figma");
  await expect(page.locator(".wb-cards")).toContainText("Figma");
  await page
    .locator(".wb-cards a")
    .filter({ hasText: "Learn & connect" })
    .first()
    .click();
  await expect(page).toHaveURL(/#login\?learn=/);
  await expect(page.getByRole("dialog")).toContainText("Welcome back");
});
test("mobile and reduced motion: usable brief, full proposal and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#builder");
  await page
    .getByRole("button", { name: "Private assistant", exact: true })
    .click();
  await page.locator(".wb-build-button").click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".wb-prompt")).toContainText("acceptance checks");
});
