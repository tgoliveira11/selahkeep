import { expect, type Page } from "@playwright/test";

/** Click Sign out and clear auth cookies so the browser session ends. */
export async function signOutUser(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign out" })).not.toBeVisible();
}
