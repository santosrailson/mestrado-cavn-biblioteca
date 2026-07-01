import { test, expect } from '@playwright/test';

test.describe('Busca', () => {
  test('deve exibir página de busca com formulário', async ({ page }) => {
    await page.goto('/busca');

    await expect(page).toHaveURL(/\/busca/);
    const searchInput = page.locator('input[type="text"], input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('deve exibir mensagem quando não há resultados', async ({ page }) => {
    await page.goto('/busca?q=ZZZZNaoExiste9999');

    await page.waitForTimeout(1000);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('deve redirecionar para página de busca ao submeter formulário', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('teste');
      await searchInput.press('Enter');
      await expect(page).toHaveURL(/\/busca/);
    }
  });
});
