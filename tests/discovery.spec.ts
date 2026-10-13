import { test, expect } from "@playwright/test";
for (const width of [390, 1440]) {
  test(`benchmark graphs and interest navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Top Benchmarks", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Top Benchmarks", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".benchmark-bars li")).toHaveCount(6);
    await page.getByText("Filter models & scores", { exact: true }).click();
    await page
      .getByLabel("Model access", { exact: true })
      .selectOption("Open weights");
    await expect(page.locator(".benchmark-bars li")).toHaveCount(2);
    await page.getByLabel("Area", { exact: true }).selectOption("Math");
    await expect(
      page.getByRole("heading", { name: "AIME 2024", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Find a model").fill("no-such-model");
    await expect(
      page.getByText("No results match these filters.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reset filters", exact: true })
      .click();
    await page.locator(".benchmark-bars summary").first().click();
    await expect(
      page.getByRole("link", { name: "Read the published result" }).first(),
    ).toHaveAttribute("href", /huggingface/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page
      .getByLabel("Interest area")
      .selectOption("Licenses & responsible reuse");
    await expect(page.locator(".topic-card")).toHaveCount(20);
    await page.getByLabel("Assessment type").selectOption("authored");
    await expect(page.locator(".topic-card")).toHaveCount(20);
    await page
      .getByRole("button", { name: "Reset filters", exact: true })
      .click();
    await page
      .getByLabel("Interest area")
      .selectOption("Files · AI model files");
    await expect(page.locator(".topic-card")).toHaveCount(4);
    await page.getByPlaceholder("Search topics").fill("gguf");
    await expect(page.locator(".topic-card")).toHaveCount(1);
    await page.getByRole("link", { name: "Learn", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Welcome back");
    await expect(page).toHaveURL(/learn%2Ffile_gguf/);
  });
}
test("license links use the learning gate and model details have breathing room", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://huggingface.co/api/models/**", (route) =>
    route.fulfill({ status: 429, body: "rate limited" }),
  );
  await page.goto("/#models?category=front-end");
  const section = page.getByRole("region", {
    name: "Top 10 open models by category",
  });
  await expect(section.locator("details").first()).not.toHaveAttribute(
    "open",
    "",
  );
  const heading = section.getByRole("heading", {
    name: "Top 10 open models by task",
  });
  expect(
    await heading.evaluate(
      (el) =>
        parseFloat(getComputedStyle(el).lineHeight) /
        parseFloat(getComputedStyle(el).fontSize),
    ),
  ).toBeGreaterThan(1.15);
  await page
    .getByTestId("category-model")
    .first()
    .getByRole("link", { name: "Apache-2.0", exact: true })
    .click();
  await expect(page).toHaveURL(/learn%2Flicense_apache_2/);
  await expect(page.getByRole("dialog")).toContainText("Welcome back");
});
test("new learning pages contain source links and gated assessment actions", async ({
  page,
}) => {
  for (const id of [
    "file_json",
    "file_gguf",
    "license_apache_2",
    "license_llama32",
  ]) {
    await page.goto(`/learn/${id}/`);
    await expect(
      page.getByRole("link", {
        name: "Official specification / license documentation",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Take an assessment" }).click();
    await expect(page.getByRole("dialog")).toContainText("Welcome back");
    await expect(page).toHaveURL(new RegExp(`assessment=${id}`));
  }
});
