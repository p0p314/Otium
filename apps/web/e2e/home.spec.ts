import { expect, test } from "@playwright/test";

test("la page d'accueil affiche l'accroche et l'action de démarrage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /commencer/i })).toBeVisible();
});
