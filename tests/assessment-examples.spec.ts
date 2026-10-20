import { test, expect } from "@playwright/test";
import fs from "node:fs";

// Authentication fixture is intercepted only by Playwright on the local dev
// server; no test login or auth bypass is added to production code.
for (const { width, wrongCount } of [
  { width: 390, wrongCount: 0 },
  { width: 1440, wrongCount: 0 },
  { width: 390, wrongCount: 1 },
  { width: 390, wrongCount: 2 },
]) {
  test(`seven-question scenario assessment and centered twenty-second timer at ${width}px, ${wrongCount} wrong`, async ({
    page,
    baseURL,
  }) => {
    expect(new URL(baseURL!).hostname).toBe("127.0.0.1");
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/src/services/firebase.ts", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `
        export const app=null,db=null,functions=null,auth=null,firebaseReady=false;
        export function onAuth(callback){callback({uid:'assessment-fixture',email:'student@example.test',displayName:'Student',getIdToken:async()=>''});return()=>{};}
        export const completeGoogleRedirect=async()=>null,logOut=async()=>{},recoverPassword=async()=>{},signInEmail=async()=>{},signInGoogle=async()=>{},signUpEmail=async()=>{},submitPaper=async()=>{},callAction=async()=>({});
        export const authErrorMessage=()=>'',watchLeaderboard=()=>()=>{};
      `,
      }),
    );
    const bank = JSON.parse(
      fs.readFileSync("public/knowledge-index.json", "utf8"),
    ).assessments.sql;
    expect(bank).toHaveLength(7);
    await page.goto("/#library");
    await page.getByPlaceholder("Search topics").fill("SQL");
    const card = page
      .locator(".topic-card")
      .filter({ has: page.getByRole("heading", { name: "SQL", exact: true }) });
    await card
      .getByRole("button", { name: "Take assessment", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "7 questions, with a strict 20-second timer each",
    );
    await page.clock.install();
    await page
      .getByRole("button", { name: "Start assessment", exact: true })
      .click();
    const exam = page.getByRole("article", { name: "Assessment question" });
    await expect(exam).toBeFocused();
    await expect
      .poll(async () => {
        const b = await exam.boundingBox();
        return Math.abs(b!.y + b!.height / 2 - 450);
      })
      .toBeLessThan(10);
    await expect(page.locator(".question-timer")).toHaveText("20s");
    await page.clock.fastForward(10_000);
    await expect(page.locator(".exam-meta")).toContainText("Question 1 / 7");
    await expect(page.locator(".question-timer")).toHaveText("10s");
    await page.clock.fastForward(7_000);
    await expect(page.locator(".question-timer")).toHaveClass(/urgent/);
    await page.clock.fastForward(4_000);
    for (let i = 1; i < 7; i++) {
      await expect(page.locator(".exam-meta")).toContainText(
        `Question ${i + 1} / 7`,
      );
      const prompt = await page.locator(".exam-card h3").innerText();
      const q = bank.find((q) => q.question === prompt);
      expect(q).toBeTruthy();
      if (i >= 5) expect(q.section).toBe("real-world");
      if (i <= wrongCount && q.kind === "multiple") {
        const wrong = q.options.findIndex(
          (_, index) => !q.answerIndices.includes(index),
        );
        await page.getByLabel(q.options[wrong], { exact: true }).check();
        await page.getByRole("button", { name: "Submit selections" }).click();
      } else if (i <= wrongCount) {
        await page
          .locator(".answer-grid")
          .getByRole("button", {
            name: q.options[(q.answerIndex + 1) % 4],
            exact: true,
          })
          .click();
      } else if (q.kind === "multiple") {
        for (const n of q.answerIndices)
          await page.getByLabel(q.options[n], { exact: true }).check();
        await page.getByRole("button", { name: "Submit selections" }).click();
      } else
        await page
          .locator(".answer-grid")
          .getByRole("button", { name: q.options[q.answerIndex], exact: true })
          .click();
    }
    await expect(page.locator(".result-card")).toContainText(
      `Score: ${6 - wrongCount}/7`,
    );
    await expect(page.locator(".result-card h3")).toContainText(
      wrongCount >= 2 ? "Failed:" : "Passed:",
    );
    if (wrongCount >= 2)
      await expect(page.locator(".result-card")).toContainText(
        "locked for 5 days",
      );
    await page.goto("/learn/sql/#real-world-example");
    await expect(
      page.getByRole("heading", { name: "Real World Example", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".example-nodes article")).toHaveCount(
      JSON.parse(fs.readFileSync("data/real-world-examples/sql.json", "utf8"))
        .diagram.nodes.length,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
