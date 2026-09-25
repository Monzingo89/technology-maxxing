import { test, expect } from "@playwright/test";

test("guest quota survives a fresh browser and signup deletes the server record", async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  test.skip(
    process.env.GUEST_EMULATOR_TESTS !== "true",
    "Requires the local demo Firebase emulators and preview on port 5174.",
  );
  expect(baseURL).toBe("http://127.0.0.1:5174");
  const collection =
    "http://127.0.0.1:8080/v1/projects/demo-ai-space/databases/(default)/documents/guestAllowances";
  const adminHeaders = { authorization: "Bearer owner" };
  const previous = await request.get(collection, { headers: adminHeaders });
  for (const document of (await previous.json()).documents || [])
    await request.delete(`http://127.0.0.1:8080/v1/${document.name}`, {
      headers: adminHeaders,
    });
  const technologies = Array.from({ length: 6 }, (_, i) => ({
    id: `topic-${i}`,
    name: `Topic ${i + 1}`,
    category: "Practice",
    tag: "Quota verification topic",
    assessmentCount: 1,
    learnPath: "./library.html",
  }));
  const index = {
    technologies,
    assessments: Object.fromEntries(
      technologies.map((topic) => [
        topic.id,
        [
          {
            id: `${topic.id}-q`,
            question:
              "Choose the correct answer to complete this test assessment.",
            options: ["Correct", "Incorrect", "Neither", "Unsure"],
            answerIndex: 0,
            explanation: "Test fixture.",
          },
        ],
      ]),
    ),
  };
  await page.route("**/knowledge-index.json", (route) =>
    route.fulfill({ json: index }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".quota-card strong")).toHaveText("5");
  // A lost completion response must leave a retry, with no double counting.
  await page.route("**/completeGuestAssessment", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fetch(); // The server committed; simulate the response being lost.
    await route.fulfill({
      status: 503,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "content-type, authorization, x-firebase-appcheck",
        "access-control-allow-methods": "POST, OPTIONS",
      },
      json: { error: { status: "UNAVAILABLE", message: "Test lost response" } },
    });
    await page.unroute("**/completeGuestAssessment");
  });
  for (let i = 0; i < 5; i++) {
    await page
      .getByRole("button", { name: "Assessments", exact: true })
      .click();
    await page
      .locator(".assessment-card")
      .filter({ hasText: `Topic ${i + 1}` })
      .click();
    await page.getByRole("button", { name: "Start assessment" }).click();
    await page
      .locator(".answer-grid")
      .getByRole("button", { name: "Correct", exact: true })
      .click();
    if (i === 0) {
      await expect(page.getByRole("alert")).toContainText(
        "Retry to save your result",
      );
      await page.getByRole("button", { name: "Retry saving result" }).click();
    }
    await expect(page.locator(".quota-card strong")).toHaveText(String(4 - i));
    await expect(page.locator(".result-card")).toContainText(
      `Passed: Topic ${i + 1}`,
    );
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close account dialog" }).click();
  await page.locator(".assessment-card").filter({ hasText: "Topic 6" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    (
      await request
        .get(collection, { headers: adminHeaders })
        .then((response) => response.json())
    ).documents[0].fields.completed.arrayValue.values,
  ).toHaveLength(5);

  // New context has no local storage, cookies, session or Firebase identity.
  const cleanContext = await browser.newContext();
  const returning = await cleanContext.newPage();
  await returning.route("**/knowledge-index.json", (route) =>
    route.fulfill({ json: index }),
  );
  await returning.goto(baseURL!);
  await expect(returning.locator(".quota-card strong")).toHaveText("0");
  await returning
    .locator(".site-header")
    .getByRole("button", { name: "Sign up", exact: true })
    .click();
  const dialog = returning.getByRole("dialog");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByLabel("Email", { exact: true })
    .fill(`ui-quota-${Date.now()}@example.test`);
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("EmulatorPassword123!");
  const deleted = returning.waitForResponse(
    (response) =>
      response.url().endsWith("/clearGuestAllowance") &&
      response.request().method() === "POST",
  );
  await dialog
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  expect((await (await deleted).json()).result).toEqual({ cleared: true });
  await expect(returning.locator(".quota-card strong")).toHaveText("unlimited");
  await expect(dialog).not.toBeVisible();
  expect(
    (
      await request
        .get(collection, { headers: adminHeaders })
        .then((response) => response.json())
    ).documents || [],
  ).toEqual([]);
  await returning
    .getByRole("button", { name: "Assessments", exact: true })
    .click();
  await returning
    .locator(".assessment-card")
    .filter({ hasText: "Topic 6" })
    .click();
  await returning.getByRole("button", { name: "Start assessment" }).click();
  await expect(returning.locator(".exam-card")).toBeVisible();
  expect(errors).toEqual([]);
  await cleanContext.close();
});

test("an unavailable quota service blocks guest assessments", async ({
  page,
  baseURL,
}) => {
  test.skip(
    process.env.GUEST_EMULATOR_TESTS !== "true",
    "Requires the local demo Firebase preview.",
  );
  expect(baseURL).toBe("http://127.0.0.1:5174");
  await page.route("**/getGuestAllowance", (route) =>
    route.fulfill({
      status: 503,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "content-type, authorization, x-firebase-appcheck",
        "access-control-allow-methods": "POST, OPTIONS",
      },
      json: { error: { status: "UNAVAILABLE", message: "Test outage" } },
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retry allowance check" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Assess", exact: true }).first(),
  ).toBeDisabled();
  await expect(page.locator(".quota-card strong")).toHaveText("—");
});

test("expired guest completion releases the UI for another attempt", async ({
  page,
  baseURL,
}) => {
  test.skip(
    process.env.GUEST_EMULATOR_TESTS !== "true",
    "Requires the local demo Firebase preview.",
  );
  expect(baseURL).toBe("http://127.0.0.1:5174");
  await page.route("**/getGuestAllowance", (route) =>
    route.fulfill({
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "content-type, authorization, x-firebase-appcheck",
        "access-control-allow-methods": "POST, OPTIONS",
      },
      json: { result: { completed: 0, remaining: 5, receipt: "test" } },
    }),
  );
  await page.route("**/startGuestAssessment", (route) =>
    route.fulfill({
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "content-type, authorization, x-firebase-appcheck",
        "access-control-allow-methods": "POST, OPTIONS",
      },
      json: { result: { completed: 0, remaining: 5, receipt: "test" } },
    }),
  );
  await page.route("**/completeGuestAssessment", (route) =>
    route.fulfill({
      status: 400,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "content-type, authorization, x-firebase-appcheck",
        "access-control-allow-methods": "POST, OPTIONS",
      },
      json: {
        error: {
          status: "FAILED_PRECONDITION",
          message: "Expired test attempt",
          details: { reason: "expired-attempt" },
        },
      },
    }),
  );
  await page.route("**/knowledge-index.json", (route) =>
    route.fulfill({
      json: {
        technologies: [
          {
            id: "test",
            name: "Test topic",
            category: "Test",
            assessmentCount: 1,
          },
        ],
        assessments: {
          test: [
            {
              id: "q",
              question: "Test question",
              options: ["Correct", "Incorrect"],
              answerIndex: 0,
            },
          ],
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Assess", exact: true }).click();
  await page.getByRole("button", { name: "Start assessment" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("session expired");
  await expect(
    page.getByRole("button", { name: "Retry saving result" }),
  ).toHaveCount(0);
  await page.locator(".assessment-card").click();
  await page.getByRole("button", { name: "Start assessment" }).click();
  await expect(page.locator(".exam-card")).toBeVisible();
});
