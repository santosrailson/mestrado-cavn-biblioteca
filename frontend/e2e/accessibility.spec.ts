import { test, expect, Page } from '@playwright/test';
import axe from 'axe-core';

declare global {
  interface Window {
    axe: typeof axe;
  }
}

async function expectNoAccessibilityViolations(page: Page) {
  // Executa a biblioteca no contexto de avaliação do Playwright. Isso mantém
  // a CSP da aplicação estrita e evita adicionar um script inline artificial
  // apenas para instrumentar o teste.
  await page.evaluate(axe.source);
  const results = await page.evaluate(async () => {
    const report = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    return report.violations;
  });
  expect(results, JSON.stringify(results, null, 2)).toEqual([]);
}

test.describe('Acessibilidade WCAG 2.2 AA', () => {
  for (const path of [
    '/',
    '/busca',
    '/acessibilidade',
    '/politica-de-privacidade',
    '/termo-de-uso',
  ]) {
    test(`não apresenta violações WCAG em ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoAccessibilityViolations(page);
    });
  }
});
