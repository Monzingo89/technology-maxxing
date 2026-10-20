import { test, expect } from "@playwright/test";

test("exam flashcards reveal, remember, persist, and filter without mixing homonyms", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#study?exam=all");
  await expect(
    page.getByRole("heading", { name: "Study For Exam", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Exam", exact: true }),
  ).toHaveValue("all");
  await expect(
    page.getByRole("status").filter({ hasText: "900 matching topics" }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", {
    name: "Search acronyms and topics",
  });
  await search.fill("System on a Chip");
  const card = page.getByRole("article", {
    name: "Flashcard for SoC",
    exact: true,
  });
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("heading", { name: "System on a Chip", exact: true }),
  ).toBeHidden();
  await card.getByRole("button", { name: "Reveal answer" }).click();
  await expect(
    card.getByRole("heading", { name: "System on a Chip", exact: true }),
  ).toBeVisible();
  await expect(card.getByText(/whole System squeezed/)).toBeVisible();
  await card.getByRole("button", { name: "I remembered" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 remembered overall" }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("combobox", { name: "Recall", exact: true })
    .selectOption("known");
  await expect(
    page.getByRole("status").filter({ hasText: "1 matching topics" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Flashcard for SoC", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Recall", exact: true })
    .selectOption("all");
  await search.fill("Security Operations Center");
  await expect(
    page.getByRole("article", { name: "Flashcard for SOC", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("CISSP, Azure, AI, batch filtering, and existing library topics are available", async ({
  page,
}) => {
  await page.goto("/#study");
  const exam = page.getByRole("combobox", { name: "Exam", exact: true });
  await expect(exam).toContainText("AI-901");
  for (const id of ["cissp", "az900", "az104", "ai901", "ai103"]) {
    await exam.selectOption(id);
    await expect(page.locator(".exam-flashcard")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Official exam objectives/ }),
    ).toHaveAttribute("href", /https:/);
  }
  await exam.selectOption("ai900-legacy");
  await expect(
    page.getByText("This exam is retired.", { exact: false }),
  ).toBeVisible();
  await exam.selectOption("all");
  for (const batch of ["2", "7", "8", "9"]) {
    await page
      .getByRole("combobox", { name: "Batch", exact: true })
      .selectOption(batch);
    await expect(
      page.getByRole("status").filter({ hasText: "100 matching topics" }),
    ).toBeVisible();
  }
  await page
    .getByRole("combobox", { name: "Batch", exact: true })
    .selectOption("all");
  await page
    .getByRole("combobox", { name: "Content", exact: true })
    .selectOption("all");
  await page.getByRole("searchbox").fill("Azure Virtual Network");
  await page.locator(".exam-topic-list > summary").click();
  await expect(
    page.getByRole("heading", { name: "Azure Virtual Network", exact: true }),
  ).toBeVisible();
});

test("protocol cards include ports, sources, shuffle, and assessment sign-in", async ({
  page,
}) => {
  await page.goto("/#study?exam=all");
  await page.getByRole("searchbox").fill("Provides encrypted remote access");
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await expect(
    page.locator(".exam-flashcard").getByText(/Usual logical ports:.*TCP 22/),
  ).toBeVisible();
  await expect(
    page
      .locator(".exam-flashcard")
      .getByRole("link", { name: "IETF RFC 4251" }),
  ).toHaveAttribute("href", "https://www.rfc-editor.org/rfc/rfc4251");
  await page.getByRole("searchbox").fill("");
  const before = await page.locator(".exam-flashcard h3").textContent();
  await page.getByRole("button", { name: "Shuffle cards" }).click();
  await expect(page.locator(".exam-flashcard h3")).not.toHaveText(before!);
  await page.getByRole("searchbox").fill("Provides encrypted remote access");
  await page.locator(".exam-topic-list > summary").click();
  await page
    .locator(".exam-topic-list")
    .getByRole("button", { name: "Take assessment", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#login\?assessment=/);
});

test("review deck removes remembered cards and direct study lessons contain memory aids", async ({
  page,
  request,
}) => {
  await page.goto("/#study?exam=all");
  await page.getByRole("searchbox").fill("Light-Emitting Diode");
  const first = page.locator(".exam-flashcard h3");
  const term = await first.textContent();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: "Review again", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Recall", exact: true })
    .selectOption("review");
  await expect(first).toHaveText(term!);
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: "I remembered" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "0 matching topics" }),
  ).toBeVisible();
  const response = await request.get("/learn/acronym_display_lcd/");
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain(
    "Liquid Crystals act as tiny light shutters",
  );
});

for (const width of [390, 760, 1440])
  test(`Study For Exam navigation and layout at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/#library");
    if (width <= 760) {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      await page
        .getByRole("dialog", { name: "Explore", exact: true })
        .getByRole("button", { name: "Study For Exam", exact: true })
        .click();
    } else
      await page
        .getByRole("navigation", { name: "Main navigation", exact: true })
        .getByRole("button", { name: "Study For Exam", exact: true })
        .click();
    await expect(
      page.getByRole("heading", { name: "Study For Exam", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".exam-flashcard")).toBeVisible();
    await page.getByRole("button", { name: "Reveal answer" }).click();
    if (width === 1440) {
      const brand = (await page.locator(".site-header .brand").boundingBox())!;
      const nav = (await page
        .getByRole("navigation", { name: "Main navigation", exact: true })
        .boundingBox())!;
      const account = (await page
        .locator(".site-header .account")
        .boundingBox())!;
      expect(brand.x + brand.width).toBeLessThan(nav.x);
      expect(nav.x + nav.width).toBeLessThan(account.x);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/exam-study-${width}.png`,
      fullPage: true,
    });
  });
