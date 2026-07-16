import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me/') || url.includes('/auth/refresh/')) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Unauthorized' }),
      });
      return;
    }
    if (url.includes('/config/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.includes('/analytics/')) {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (url.includes('/categorias/') || url.includes('/timeline/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
    });
  });
});

test.describe('Regressão visual', () => {
  test('página inicial mantém o layout público', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Nenhuma categoria disponível|No categories available/)).toBeVisible();
    await expect(page.getByText(/Nenhum documento ainda|No documents yet/)).toBeVisible();
    await expect(page.getByText(/Nenhum marco histórico|No historical milestones/)).toBeVisible();
    await expect(page).toHaveScreenshot('home-public.png', {
      fullPage: true,
      timeout: 15000,
    });
  });

  test('busca vazia mantém o estado inicial', async ({ page }) => {
    await page.goto('/busca');
    await expect(page.getByRole('heading', { name: /Busca|Search/ })).toBeVisible();
    await expect(page.getByText(/Nenhum documento encontrado|No documents found/)).toBeVisible();
    await expect(page).toHaveScreenshot('search-empty.png', {
      fullPage: true,
      maxDiffPixels: 300,
      timeout: 15000,
    });
  });
});
