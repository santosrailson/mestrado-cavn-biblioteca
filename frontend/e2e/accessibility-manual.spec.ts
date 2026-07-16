import { test, expect } from '@playwright/test';

test.describe('Validações manuais reproduzíveis de acessibilidade', () => {
  test('o skip link recebe foco no primeiro Tab', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
  });

  test('contraste alto e preferência por movimento reduzido são respeitados', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await page.getByRole('button', { name: /Alto contraste/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast');

    const transitionDuration = await page.locator('body').evaluate((element) =>
      getComputedStyle(element).transitionDuration
    );
    expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);
  });
});
