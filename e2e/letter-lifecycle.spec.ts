import { test, expect } from "@playwright/test";
import { signOutUser } from "./helpers";

function randomCredentials() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    email: `e2e-${id}@example.com`,
    password: "E2eTestPassword123!",
    title: `Private letter ${id}`,
    body: `SENTINEL-E2E-PRIVATE-BODY-${id}`,
    editedTitle: `Edited letter ${id}`,
    editedBody: `SENTINEL-E2E-EDITED-BODY-${id}`,
  };
}

test.describe("private letter lifecycle", () => {
  test("register, login, unlock vault, write, list, edit, sign out", async ({ page }) => {
    const creds = randomCredentials();

    // --- Register (auto-signs in) ---
    await page.goto("/register");
    await page.getByPlaceholder("Email").fill(creds.email);
    await page.getByPlaceholder("Password (min 8 characters)").fill(creds.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/letters$/, { timeout: 15_000 });

    // --- Clear session and log in with the new account ---
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(creds.email);
    await page.getByPlaceholder("Password").fill(creds.password);
    await page.getByRole("button", { name: "Sign in with email" }).click();
    await page.waitForURL(/\/letters$/, { timeout: 15_000 });

    // --- Write private letter (vault setup happens when writing the first letter) ---
    await page.getByRole("link", { name: "Write a letter" }).click();
    await page.waitForURL(/\/letters\/new/);
    await page.getByRole("button", { name: "Set up my vault" }).click();
    await page.getByPlaceholder("A title for your letter").fill(creds.title);
    await page.getByPlaceholder("Dear God...").fill(creds.body);
    await page.getByRole("button", { name: "Save letter" }).click();
    await page.waitForURL(/\/letters\/[^/]+$/, { timeout: 15_000 });

    // --- List letters ---
    await page.getByRole("link", { name: "My Letters" }).click();
    await page.waitForURL(/\/letters$/);
    await expect(page.getByRole("link", { name: creds.title })).toBeVisible();

    // --- Open and edit letter ---
    await page.getByRole("link", { name: creds.title }).click();
    await page.waitForURL(/\/letters\/[^/]+$/);
    await expect(page.getByText(creds.body)).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("main input").fill(creds.editedTitle);
    await page.locator("main textarea").fill(creds.editedBody);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("heading", { name: creds.editedTitle })).toBeVisible();
    await expect(page.getByText(creds.editedBody)).toBeVisible();

    // --- Sign out ---
    await signOutUser(page);

    // --- Confirm signed-out session cannot access private letters API ---
    const lettersRes = await page.request.get("/api/letters");
    expect(lettersRes.status()).toBe(401);
  });
});
