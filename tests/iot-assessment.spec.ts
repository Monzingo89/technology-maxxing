import { test, expect } from "@playwright/test";
import fs from "node:fs";

const banks = JSON.parse(
  fs.readFileSync("public/knowledge-index.json", "utf8"),
).assessments;

async function submitCorrect(page, question) {
  if (question.kind === "multiple") {
    for (const index of question.answerIndices)
      await page.getByLabel(question.options[index], { exact: true }).check();
    await page.getByRole("button", { name: "Submit selections" }).click();
    return;
  }
  await page
    .locator(".answer-grid")
    .getByRole("button", {
      name: question.options[question.answerIndex],
      exact: true,
    })
    .click();
}

async function submitWrong(page, question) {
  if (question.kind === "multiple") {
    const wrong = question.options.findIndex(
      (_, index) => !question.answerIndices.includes(index),
    );
    await page.getByLabel(question.options[wrong], { exact: true }).check();
    await page.getByRole("button", { name: "Submit selections" }).click();
    return;
  }
  await page
    .locator(".answer-grid")
    .getByRole("button", {
      name: question.options[(question.answerIndex + 1) % 4],
      exact: true,
    })
    .click();
}

test.beforeEach(async ({ page, baseURL }) => {
  test.skip(
    process.env.ASSESSMENT_LOCAL_TESTS !== "true",
    "Run against the isolated local development preview with Firebase disabled.",
  );
  expect(baseURL).toBe("http://127.0.0.1:5176");
  await page.goto("/");
  await expect(
    page.getByText("Local preview: this browser’s allowance only."),
  ).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`reviewed assessment preserves shuffled answers and explains a missed skill at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.getByPlaceholder("Search topics").fill("RLHF");
    await page
      .locator(".topic-card")
      .getByRole("button", { name: "Assess", exact: true })
      .click();
    await page.getByRole("button", { name: "Start assessment" }).click();
    const seen = new Set<string>();
    let missed;
    for (let i = 0; i < 5; i++) {
      await expect(page.locator(".exam-meta")).toContainText(
        `Question ${i + 1} / 5`,
      );
      const prompt = await page.locator(".exam-card h3").innerText();
      const question = banks.rlhf.find((q) => q.question === prompt);
      expect(question).toBeTruthy();
      expect(seen.has(question.id)).toBe(false);
      seen.add(question.id);
      if (i === 0) expect(question.difficulty).toBe("foundation");
      if (i === 4) expect(question.difficulty).toBe("advanced");
      await expect(
        page.getByRole("region", { name: "Answer review" }),
      ).toHaveCount(0);
      if (i === 0) {
        const answer = question.options[(question.answerIndex + 1) % 4];
        missed = { question, answer };
        await page
          .locator(".answer-grid")
          .getByRole("button", { name: answer, exact: true })
          .click();
      } else await submitCorrect(page, question);
    }
    await expect(page.locator(".result-card")).toContainText("Score: 4/5");
    await expect(page.locator(".result-card h3")).toContainText("Passed:");
    const review = page.getByRole("region", { name: "Answer review" });
    await expect(review.locator("details")).toHaveCount(5);
    await expect(review.locator("details[open]")).toHaveCount(1);
    await expect(review.locator("details[open]")).toContainText(
      missed.question.skill,
    );
    await expect(review.locator("details[open]")).toContainText(
      `Your answer: ${missed.answer}`,
    );
    await expect(review.locator("details[open]")).toContainText(
      `Correct answer: ${missed.question.options[missed.question.answerIndex]}`,
    );
    await expect(review.locator("details[open]")).toContainText(
      missed.question.explanation,
    );
    await expect(review.locator("details[open] a").first()).toHaveAttribute(
      "href",
      missed.question.sources[0].url,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("a timeout is reported as unanswered and a three-of-five attempt fails", async ({
  page,
}) => {
  await page.clock.install();
  await page.getByPlaceholder("Search topics").fill("SFT (");
  await page
    .locator(".topic-card")
    .getByRole("button", { name: "Assess", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Each question has a strict 10-second timer",
  );
  await page.getByRole("button", { name: "Start assessment" }).click();
  const timedOutPrompt = await page.locator(".exam-card h3").innerText();
  await page.clock.fastForward(7_000);
  await expect(page.locator(".question-timer")).toHaveClass(/urgent/);
  await page.clock.fastForward(4_000);
  for (let i = 1; i < 5; i++) {
    await expect(page.locator(".exam-meta")).toContainText(
      `Question ${i + 1} / 5`,
    );
    const prompt = await page.locator(".exam-card h3").innerText();
    const question = banks.sft.find((q) => q.question === prompt);
    if (i === 1) await submitWrong(page, question);
    else await submitCorrect(page, question);
  }
  await expect(page.locator(".result-card")).toContainText("Score: 3/5");
  await expect(page.locator(".result-card h3")).toContainText("Failed:");
  await expect(page.locator(".answer-review details[open]")).toHaveCount(2);
  const unanswered = page
    .locator(".answer-review details")
    .filter({ hasText: timedOutPrompt });
  await expect(unanswered.locator("summary")).toContainText("Unanswered");
  await expect(unanswered).toContainText("No answer before time ran out.");
});
