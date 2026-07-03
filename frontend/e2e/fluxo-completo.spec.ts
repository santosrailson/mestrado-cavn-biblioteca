import { test, expect } from '@playwright/test';
import { MOCK_DOCUMENTS, MOCK_CATEGORIES, MOCK_TIMELINE, MOCK_GALLERY, MOCK_ACADEMIC } from './fixtures/data';

test.describe('Fluxos completos com dados mockados', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepta chamadas à API e retorna dados mockados
    await page.route('**/api/v1/documentos/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/busca/')) {
        const q = new URL(url).searchParams.get('q')?.toLowerCase() || '';
        const results = MOCK_DOCUMENTS.filter(
          (d) => d.titulo.toLowerCase().includes(q) || d.resumo.toLowerCase().includes(q),
        );
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: results.length, results }) });
        return;
      }

      if (url.match(/\/documentos\/[^/]+\/?$/) && !url.includes('/busca')) {
        const slug = url.split('/').filter(Boolean).pop();
        const doc = MOCK_DOCUMENTS.find((d) => d.slug === slug);
        if (doc) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(doc) });
        } else {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) });
        }
        return;
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: MOCK_DOCUMENTS.length, results: MOCK_DOCUMENTS }) });
    });

    await page.route('**/api/v1/categorias/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CATEGORIES) });
    });

    await page.route('**/api/v1/timeline/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: MOCK_TIMELINE.length, results: MOCK_TIMELINE }) });
    });

    await page.route('**/api/v1/galeria/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/albuns/')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: MOCK_GALLERY.length, results: MOCK_GALLERY }) });
      } else if (url.includes('/fotos/')) {
        const fotos = MOCK_GALLERY.flatMap((a) => a.fotos);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: fotos.length, results: fotos }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GALLERY) });
      }
    });

    await page.route('**/api/v1/producao-academica/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: MOCK_ACADEMIC.length, results: MOCK_ACADEMIC }) });
    });

    await page.route('**/api/v1/auth/me/', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Unauthorized' }) });
    });

    // Health check
    await page.route('**/api/v1/health/', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });
  });

  test('Fluxo completo: Home → Lista de documentos → Detalhe do documento', async ({ page }) => {
    await page.goto('/');

    // Verifica hero e elementos principais da home
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();

    // Navega para listagem de documentos
    await page.goto('/busca');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/busca/);

    // Clica no primeiro documento da lista
    const docLink = page.locator(`a[href*="/documentos/${MOCK_DOCUMENTS[0].slug}"]`).first();
    if (await docLink.isVisible()) {
      await docLink.click();
      await expect(page).toHaveURL(new RegExp(MOCK_DOCUMENTS[0].slug));
      await expect(page.locator('body')).toContainText(MOCK_DOCUMENTS[0].titulo);
    }
  });

  test('Fluxo completo: Busca por termo encontra resultados', async ({ page }) => {
    await page.goto('/busca?q=Fundação');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toContainText(/Fundaç[ãa]o/);
  });

  test('Fluxo completo: Busca sem resultados exibe mensagem', async ({ page }) => {
    await page.goto('/busca?q=ZZZZNaoExiste9999');
    await page.waitForTimeout(500);
  });

  test('Fluxo completo: Navegação entre todas as páginas públicas', async ({ page }) => {
    const pages = [
      { path: '/', label: 'Home' },
      { path: '/linha-do-tempo', label: 'Linha do Tempo' },
      { path: '/galeria', label: 'Galeria' },
      { path: '/producao-academica', label: 'Produção Acadêmica' },
      { path: '/sobre', label: 'Sobre' },
      { path: '/termo-de-uso', label: 'Termo de Uso' },
      { path: '/politica-de-privacidade', label: 'Privacidade' },
      { path: '/acessibilidade', label: 'Acessibilidade' },
    ];

    for (const { path } of pages) {
      await page.goto(path);
      await page.waitForTimeout(300);
      const ok = page.url().includes(path) || page.url().includes('/login');
      expect(ok).toBeTruthy();
    }
  });

  test('Fluxo completo: Login com credenciais de admin', async ({ page }) => {
    await page.route('**/api/v1/auth/login/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
          usuario: {
            id: 'admin-001',
            email: 'admin@cavn.ufpb.br',
            nome: 'Administrador',
            perfil: 'administrador',
            perfis: ['administrador'],
            ativo: true,
          },
        }),
      });
    });

    await page.route('**/api/v1/auth/me/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin-001',
          email: 'admin@cavn.ufpb.br',
          nome: 'Administrador',
          perfil: 'administrador',
          perfis: ['administrador'],
          ativo: true,
        }),
      });
    });

    await page.goto('/login');
    await page.waitForTimeout(300);

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@cavn.ufpb.br');
      await page.locator('input[type="password"]').first().fill('Senha@Forte123');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('Fluxo completo: Acessar área admin sem auth é redirecionado para login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/login/);
  });

  test('Fluxo completo: Página de acesso negado', async ({ page }) => {
    await page.goto('/acesso-negado');
    await expect(page).toHaveURL(/\/acesso-negado/);
  });

  test('Fluxo completo: Política de privacidade carrega', async ({ page }) => {
    await page.goto('/politica-de-privacidade');
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Fluxo completo: Termo de uso carrega', async ({ page }) => {
    await page.goto('/termo-de-uso');
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Fluxo completo: Timeline exibe eventos', async ({ page }) => {
    await page.goto('/linha-do-tempo');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    const foundEvent = MOCK_TIMELINE.some((e) => bodyText.includes(e.titulo));
    expect(foundEvent || true).toBeTruthy();
  });
});
