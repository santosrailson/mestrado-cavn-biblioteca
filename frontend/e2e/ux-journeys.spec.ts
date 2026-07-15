import { test, expect } from '@playwright/test';

test.describe('Jornadas de UX', () => {
  test('permite buscar por teclado e mantém filtros na URL', async ({ page }) => {
    await page.route('**/api/v1/documentos/busca/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      })
    );

    await page.goto('/busca');
    const input = page.getByRole('searchbox').first();
    await input.fill('memória');
    await input.press('Enter');
    await expect(page).toHaveURL(/q=mem%C3%B3ria/);

    const typeFilter = page.getByLabel('Tipo de documento');
    await typeFilter.selectOption('fotografia');
    await expect(page).toHaveURL(/tipo=fotografia/);
    await expect(page.getByRole('status')).toContainText(/Nenhum documento encontrado/i);
  });

  test('oferece controles de acessibilidade por teclado', async ({ page }) => {
    await page.goto('/');
    const toolbar = page.getByRole('region', { name: /barra de acessibilidade/i });
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByLabel('Idioma da interface')).toBeVisible();
    await toolbar.getByLabel('Aumentar fonte').focus();
    await expect(toolbar.getByLabel('Aumentar fonte')).toBeFocused();
  });
});
