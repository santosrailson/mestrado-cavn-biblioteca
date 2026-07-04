import { test, expect } from '@playwright/test';

test.describe('Busca', () => {
  test('deve exibir página de busca com formulário', async ({ page }) => {
    await page.goto('/busca');

    await expect(page).toHaveURL(/\/busca/);
    const searchInput = page.locator('input[type="text"], input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('deve exibir mensagem quando não há resultados', async ({ page }) => {
    await page.route('**/api/v1/documentos/busca/**q=ZZZZNaoExiste9999**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dados: [],
          total: 0,
          pagina: 1,
          limite: 20,
          totalPaginas: 0,
          temProxima: false,
          temAnterior: false,
        }),
      })
    );

    await page.goto('/busca?q=ZZZZNaoExiste9999');

    await expect(page.getByRole('status').filter({ hasText: 'Nenhum documento encontrado' })).toBeVisible();
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
