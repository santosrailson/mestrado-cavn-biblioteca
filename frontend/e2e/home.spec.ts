import { test, expect } from '@playwright/test';

test.describe('Página inicial', () => {
  test('deve carregar com título e elementos principais', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Repositório Digital CAVN/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('deve ter barra de acessibilidade com controles', async ({ page }) => {
    await page.goto('/');

    const accessibilityBar = page.locator('[role="region"][aria-label*="acessibilidade"]');
    await expect(accessibilityBar).toBeVisible();

    const contrastBtn = accessibilityBar.locator('button[aria-pressed]').first();
    await expect(contrastBtn).toBeVisible();
  });

  test('deve exibir a seção de busca', async ({ page }) => {
    await page.goto('/');

    const searchSection = page.getByRole('searchbox').first();
    await expect(searchSection).toBeVisible();
  });

  test('deve navegar para a página sobre', async ({ page }) => {
    await page.goto('/');

    const aboutLink = page.locator('a').filter({ hasText: 'Sobre' }).first();
    await aboutLink.click();

    await expect(page).toHaveURL(/\/sobre/);
  });

  test('deve navegar para a linha do tempo', async ({ page }) => {
    await page.goto('/');

    const timelineLink = page.locator('a').filter({ hasText: 'Linha do Tempo' }).first();
    await timelineLink.click();

    await expect(page).toHaveURL(/\/linha-do-tempo/);
  });

  test('deve navegar para a galeria', async ({ page }) => {
    await page.goto('/');

    const galleryLink = page.locator('a').filter({ hasText: 'Galeria' }).first();
    await galleryLink.click();

    await expect(page).toHaveURL(/\/galeria/);
  });

  test('deve navegar para produção acadêmica', async ({ page }) => {
    await page.goto('/');

    const academicLink = page.locator('a').filter({ hasText: 'Produção Acadêmica' }).first();
    await academicLink.click();

    await expect(page).toHaveURL(/\/producao-academica/);
  });

  test('deve navegar para termos de uso', async ({ page }) => {
    await page.goto('/');

    const termsLink = page.locator('a').filter({ hasText: 'Termo de Uso' }).first();
    await termsLink.click();

    await expect(page).toHaveURL(/\/termo-de-uso/);
  });
});
