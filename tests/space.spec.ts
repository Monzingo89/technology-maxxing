import { test, expect } from "@playwright/test";
test("desktop: preview onboarding, 3D world, quiz, school, privacy, and deletion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Stay curious." }),
  ).toBeVisible();
  await expect(page.locator(".hero-world canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Join the space", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create free account" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Explore the local preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Different minds." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create my agent", exact: true })
    .click();
  await expect(
    page.locator(".avatar-stage canvas[data-ready=true]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Body", exact: true }).click();
  await page
    .getByLabel("Presentation", { exact: true })
    .selectOption("feminine");
  await page.getByLabel("legs", { exact: true }).selectOption("robotic");
  await page.getByRole("button", { name: "Face", exact: true }).click();
  await page.getByLabel("eyes", { exact: true }).fill("70");
  await page.screenshot({ path: "test-results/desktop-builder.png" });
  await page.getByRole("button", { name: "Find my calling" }).click();
  for (let i = 0; i < 12; i++)
    await page
      .getByRole("button", { name: "Build a tool to solve it" })
      .click();
  await expect(
    page.getByRole("heading", { name: "Hello, developer." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Give my agent a name" }).click();
  await page.getByLabel("Username", { exact: true }).fill("curious_builder");
  await page.getByLabel("I am 18 or older").check();
  await page
    .getByRole("button", { name: "Enter AI Space", exact: true })
    .click();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Got it, what’s next?" }).click();
  await page
    .getByRole("button", { name: "Let’s explore", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "curious_builder’s little universe." }),
  ).toBeVisible();
  await expect(page.locator(".world-container canvas")).toBeVisible();
  await page.locator(".world-container canvas").press("ArrowRight");
  await page.screenshot({ path: "test-results/desktop-world.png" });
  await page
    .locator(".world-nav")
    .getByRole("button", { name: "The Arena" })
    .click();
  await page
    .getByRole("button", { name: "Try an unranked practice round" })
    .click();
  await page.getByRole("button", { name: "Let’s do this" }).click();
  await expect(
    page.getByRole("heading", {
      name: "What does an AI agent use to take actions?",
    }),
  ).toBeVisible({ timeout: 10000 });
  for (const answer of [
    "Tools and instructions",
    "Clear context and a goal",
    "A plausible but false output",
    "Relevant source material",
  ])
    await page.getByRole("button", { name: new RegExp(answer) }).click();
  await expect(
    page.getByRole("heading", { name: "4 out of 5." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await page.getByRole("button", { name: "The school", exact: true }).click();
  await page.getByLabel("Your next practice").selectOption("teacher");
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.getByRole("button", { name: "Continue learning" }).click();
  await page.getByRole("button", { name: "Continue learning" }).click();
  await page.getByRole("button", { name: "Complete preview path" }).click();
  await expect(
    page.getByRole("heading", { name: "Currently exploring: Teacher" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings & privacy" }).click();
  await page.getByRole("switch").check();
  await page
    .getByRole("button", { name: "Discover", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Settings & privacy" }).click();
  await page
    .getByRole("button", { name: "View this device’s usage signals" })
    .click();
  await expect(page.getByText("events saved")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Change community", exact: true })
    .click();
  await page
    .locator("dialog")
    .getByRole("button", { name: /OpenAI/ })
    .click();
  await expect(page.getByRole("status")).toContainText("30 days");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Delete my account and data" })
    .click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByLabel("I understand this cannot be undone.").check();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("button", { name: "Join the space", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile: no overflow, accessible navigation, signup, gallery, search and indexable library", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".hero-world canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Join the space", exact: true })
    .click();
  await page.screenshot({ path: "test-results/mobile-signup.png" });
  await page
    .getByRole("button", { name: "Privacy Policy", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Preview policy and operator" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Imagination looks good on you." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Knowledge library", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Filter technologies" })
    .fill("Python");
  await expect(page.locator(".knowledge-card").first()).toBeVisible();
  const opened = page.waitForEvent("popup");
  await page.locator('.knowledge-card[href="./learn/python/"]').click();
  const article = await opened;
  await expect(article).toHaveTitle(/Python/);
  await expect(article.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /learn\/python/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await context.close();
});
