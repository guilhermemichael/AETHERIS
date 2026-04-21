import { expect, test } from "@playwright/test";

test("loads the ritual shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("AETHERIS")).toBeVisible();
});

