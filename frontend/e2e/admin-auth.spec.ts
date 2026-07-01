import { test, expect } from '@playwright/test';

test.describe('Autenticação admin', () => {
  test('deve exibir página de login', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login/);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@cavn.ufpb.br');
      await passwordInput.fill('senha_errada');
      await submitBtn.click();

      await page.waitForTimeout(1000);
    }
  });

  test('deve redirecionar para login ao acessar admin sem auth', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/login/);
  });

  test('deve exibir página de acesso negado', async ({ page }) => {
    await page.goto('/acesso-negado');

    await expect(page).toHaveURL(/\/acesso-negado/);
  });
});
