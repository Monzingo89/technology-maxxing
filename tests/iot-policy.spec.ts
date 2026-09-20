import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1050 },
  { width: 390, height: 844 },
]) {
  test(`policies, signup placeholders and paper tabs at ${viewport.width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Prove what you know, topic by topic.",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Sign up free", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Email", { exact: true })).toHaveAttribute(
      "placeholder",
      "you@example.com",
    );
    await expect(
      dialog.getByLabel("Password", { exact: true }),
    ).toHaveAttribute("placeholder", "At least 12 characters");
    await expect(dialog.getByRole("checkbox")).not.toBeChecked();
    await expect(
      dialog.getByRole("link", { name: "Privacy Policy", exact: true }),
    ).toHaveAttribute("href", "#privacy");
    await expect(
      dialog.getByRole("link", { name: "Terms of Service", exact: true }),
    ).toHaveAttribute("href", "#terms");
    await dialog
      .getByRole("button", { name: "Already have an account? Log in" })
      .click();
    await expect(
      dialog.getByLabel("Password", { exact: true }),
    ).toHaveAttribute("placeholder", "Your password");
    await dialog.getByRole("button", { name: "Close signup" }).click();

    await page
      .getByRole("navigation", { name: "Legal", exact: true })
      .getByRole("link", { name: "Privacy Policy" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Privacy Policy", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Five guest assessments and your IP address",
      }),
    ).toBeVisible();
    await expect(page.locator(".legal-page")).toContainText(
      "No guest IP identifier is added to your account",
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Privacy Policy", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Legal", exact: true })
      .getByRole("link", { name: "Terms of Service" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Terms of Service", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".legal-page")).toContainText(
      "not-for-profit basis",
    );
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Privacy Policy", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Papers", exact: true }).click();
    const paper = page.getByRole("link", {
      name: "Attention Is All You Need",
      exact: true,
    });
    await expect(paper).toHaveAttribute("target", "_blank");
    await expect(paper).toHaveAttribute("rel", "noopener noreferrer");
    // Avoid dependence on the publisher's network or authentication.
    await context.route("https://arxiv.org/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>External paper fixture</h1>",
      }),
    );
    const openerUrl = page.url();
    const popupPromise = page.waitForEvent("popup");
    await paper.click();
    const popup = await popupPromise;
    await expect(
      popup.getByRole("heading", { name: "External paper fixture" }),
    ).toBeVisible();
    expect(page.url()).toBe(openerUrl);
    await expect(
      page.getByRole("heading", {
        name: "White Paper Hall of Fame",
        exact: true,
      }),
    ).toBeVisible();
    await popup.close();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/iot-papers-${viewport.width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
