import { expect, test } from "@playwright/test";

test("demo dashboard is clearly labeled and opens the editorial library", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Modo demonstração")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Bom dia, Bruno/ })).toBeVisible();
  await page.getByRole("button", { name: "Todos os projetos" }).click();
  await expect(page.getByRole("heading", { name: "Biblioteca de projetos" })).toBeVisible();
});
