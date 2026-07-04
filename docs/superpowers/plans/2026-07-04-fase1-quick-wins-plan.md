# Fase 1 — Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Quick Wins defined in `docs/superpowers/specs/2026-07-04-fase1-quick-wins-design.md`: rate limiting for auth/2FA, remove XSS vector in 2FA setup, add CSP to the SPA, fix E2E tests, remove localStorage persistence from auth store, and standardize TanStack Query keys.

**Architecture:** Add a small DRF-compatible rate-limiting helper in the backend and apply it consistently to authentication endpoints. Refactor frontend components and tests to remove unsafe patterns and anti-fragile assertions. Keep changes scoped; no architecture redesign.

**Tech Stack:** Django 5.2, DRF, django-ratelimit, React 18, TypeScript, Vite, TanStack Query, Zustand, Playwright, Vitest.

## Global Constraints

- Backend tests target `DJANGO_SETTINGS_MODULE=config.settings_test`.
- CI must stay green: `ruff check apps config`, `pytest -q`, `npm run lint`, `npm run test -- --run`, `npm run build`.
- All auth tokens continue to travel in `httpOnly` cookies; no tokens in `localStorage`.
- Rate limits return HTTP 429 with a generic Portuguese message.
- CSP must allow Bunny Fonts and inline styles (current SPA requirement) while blocking external scripts/images by default.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/apps/users/ratelimit.py` | New helper: DRF-compatible rate-limit decorator and mixin returning HTTP 429. |
| `backend/apps/users/views.py` | Apply rate limiting to login, refresh, password-change, and password-request views. |
| `backend/apps/users/twofactor.py` | Apply rate limiting to 2FA status/setup/verify-setup/disable/login endpoints. |
| `backend/apps/users/tests/test_ratelimit.py` | New tests verifying HTTP 429 behavior for protected endpoints. |
| `frontend/src/features/auth/components/TwoFactorSetup.tsx` | Render QR code as base64 `<img>` instead of `dangerouslySetInnerHTML`. |
| `frontend/index.html` | Add `<meta http-equiv="Content-Security-Policy">`. |
| `frontend/src/features/auth/stores/authStore.ts` | Remove `persist` middleware; keep auth state in memory only. |
| `frontend/src/features/auth/stores/authStore.test.ts` | Update assertions: localStorage must not contain `user`. |
| `frontend/src/shared/hooks/useDocuments.ts` | Standardize `queryKey` to array format. |
| `frontend/src/shared/hooks/useSearch.ts` | Standardize `queryKey` to array format matching `useDocuments`. |
| `frontend/e2e/fluxo-completo.spec.ts` | Replace fixed timeouts with state assertions; fix always-true assertion. |

---

### Task 1: Create DRF-compatible rate-limit helper

**Files:**
- Create: `backend/apps/users/ratelimit.py`
- Test: `backend/apps/users/tests/test_ratelimit.py` (failing test written in Task 3)

**Interfaces:**
- Consumes: `django_ratelimit.core.is_ratelimited`, DRF `Request` (uses `_request` fallback).
- Produces: `drf_ratelimit(group, key="ip", rate="5/m")` decorator; `RateLimitedMixin` class with `rate_limit_group`, `rate_limit_key`, `rate_limit_rate` attributes.

- [ ] **Step 1: Create the helper module**

Create `backend/apps/users/ratelimit.py` with:

```python
"""Helpers de rate limiting para views do DRF."""

from functools import wraps

from django_ratelimit.core import is_ratelimited
from rest_framework import status
from rest_framework.response import Response


class RateLimitedMixin:
    """Mixin para class-based views do DRF que aplica rate limiting por IP.

    Atributos configuráveis:
      - rate_limit_group: nome do grupo (padrão: nome da classe)
      - rate_limit_key: chave do django-ratelimit (padrão: 'ip')
      - rate_limit_rate: taxa no formato django-ratelimit (padrão: '5/m')
    """

    rate_limit_group = None
    rate_limit_key = "ip"
    rate_limit_rate = "5/m"

    def dispatch(self, request, *args, **kwargs):
        underlying = getattr(request, "_request", request)
        ratelimited = is_ratelimited(
            request=underlying,
            group=self.rate_limit_group or self.__class__.__name__,
            key=self.rate_limit_key,
            rate=self.rate_limit_rate,
            method=is_ratelimited.ALL,
            increment=True,
        )
        if ratelimited:
            return Response(
                {"detail": "Muitas tentativas. Aguarde um momento."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return super().dispatch(request, *args, **kwargs)


def drf_ratelimit(*, group: str, key: str = "ip", rate: str = "5/m"):
    """Decorador de rate limiting compatível com function-based views do DRF.

    Retorna HTTP 429 quando o limite é excedido.
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            underlying = getattr(request, "_request", request)
            ratelimited = is_ratelimited(
                request=underlying,
                group=group,
                key=key,
                rate=rate,
                method=is_ratelimited.ALL,
                increment=True,
            )
            if ratelimited:
                return Response(
                    {"detail": "Muitas tentativas. Aguarde um momento."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator
```

- [ ] **Step 2: Verify syntax**

Run:

```bash
cd /opt/cavn-digital/backend
source .venv-linux/bin/activate
python -m py_compile apps/users/ratelimit.py
```

Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
cd /opt/cavn-digital
git add backend/apps/users/ratelimit.py
git commit -m "feat(users): add DRF-compatible rate-limit helper"
```

---

### Task 2: Apply rate limiting to auth views

**Files:**
- Modify: `backend/apps/users/views.py`

**Interfaces:**
- Consumes: `RateLimitedMixin` and `drf_ratelimit` from `apps.users.ratelimit`.
- Produces: `CustomTokenObtainPairView`, `CustomTokenRefreshView`, and password views now return 429 after excessive requests.

- [ ] **Step 1: Update imports and class-based views**

In `backend/apps/users/views.py`, add to imports:

```python
from apps.users.ratelimit import RateLimitedMixin, drf_ratelimit
```

Change class definitions:

```python
class CustomTokenObtainPairView(RateLimitedMixin, TokenObtainPairView):
    """Login via JWT: define cookies httpOnly e retorna dados do usuário.

    Integra com django-axes para bloqueio temporário após tentativas falhas.
    """

    permission_classes = [AllowAny]
    rate_limit_group = "login"
    rate_limit_rate = "5/m"
    # ... resto permanece igual
```

```python
class CustomTokenRefreshView(RateLimitedMixin, TokenRefreshView):
    """Renova o access token lendo o refresh do cookie httpOnly."""

    permission_classes = [AllowAny]
    rate_limit_group = "token_refresh"
    rate_limit_rate = "10/m"
    # ... resto permanece igual
```

- [ ] **Step 2: Apply decorator to function views**

In the same file, decorate the following views (keep existing decorators below `@api_view` and `@permission_classes`):

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="alterar_senha", rate="5/m")
def alterar_propria_senha(request):
    # ... existing body unchanged
```

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="solicitar_senha", rate="3/h")
def solicitar_alteracao_senha(request):
    # ... existing body unchanged
```

- [ ] **Step 3: Run backend lint**

Run:

```bash
cd /opt/cavn-digital/backend
source .venv-linux/bin/activate
ruff check apps/users/views.py
```

Expected: `All checks passed!`

- [ ] **Step 4: Commit**

```bash
cd /opt/cavn-digital
git add backend/apps/users/views.py
git commit -m "feat(users): apply rate limiting to auth views"
```

---

### Task 3: Apply rate limiting to 2FA views

**Files:**
- Modify: `backend/apps/users/twofactor.py`

**Interfaces:**
- Consumes: `drf_ratelimit` from `apps.users.ratelimit`.
- Produces: 2FA setup/verify/disable/login/status return 429 after excessive requests.

- [ ] **Step 1: Update imports and decorators**

In `backend/apps/users/twofactor.py`, add to imports:

```python
from apps.users.ratelimit import drf_ratelimit
```

Apply decorators (place below `@permission_classes`):

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_status", rate="10/m")
def twofactor_status(request):
    # ... existing body unchanged
```

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_setup", rate="5/m")
def twofactor_setup(request):
    # ... existing body unchanged
```

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_verify_setup", rate="5/m")
def twofactor_verify_setup(request):
    # ... existing body unchanged
```

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_disable", rate="5/m")
def twofactor_disable(request):
    # ... existing body unchanged
```

```python
@api_view(["POST"])
@permission_classes([AllowAny])
@drf_ratelimit(group="twofactor_login", rate="5/m")
def twofactor_login(request):
    # ... existing body unchanged
```

- [ ] **Step 2: Run backend lint**

Run:

```bash
cd /opt/cavn-digital/backend
source .venv-linux/bin/activate
ruff check apps/users/twofactor.py
```

Expected: `All checks passed!`

- [ ] **Step 3: Commit**

```bash
cd /opt/cavn-digital
git add backend/apps/users/twofactor.py
git commit -m "feat(users): apply rate limiting to 2FA views"
```

---

### Task 4: Add rate-limit tests

**Files:**
- Create: `backend/apps/users/tests/test_ratelimit.py`

**Interfaces:**
- Consumes: existing `UserFactory` and APIClient pattern.
- Produces: tests verifying 429 responses after exceeding limits.

- [ ] **Step 1: Write the test module**

Create `backend/apps/users/tests/test_ratelimit.py`:

```python
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_cache():
    """Limpa o cache antes de cada teste para não acumular requisições."""
    cache.clear()


@pytest.mark.django_db
def test_login_rate_limit_returns_429_after_excess(api_client):
    User.objects.create_user(
        email="teste@cavn.br",
        username="teste",
        password="senha123",
        role=UserRole.VISITOR,
    )
    url = "/api/v1/auth/login/"
    payload = {"email": "teste@cavn.br", "password": "errada"}

    for _ in range(5):
        response = api_client.post(url, payload)
        assert response.status_code == 401

    response = api_client.post(url, payload)
    assert response.status_code == 429
    assert "Muitas tentativas" in response.data["detail"]


@pytest.mark.django_db
def test_twofactor_login_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.ADMINISTRATOR)
    url = "/api/v1/auth/2fa/login/"
    payload = {"user_id": str(user.pk), "token": "000000"}

    for _ in range(5):
        response = api_client.post(url, payload)
        assert response.status_code == 401

    response = api_client.post(url, payload)
    assert response.status_code == 429


@pytest.mark.django_db
def test_twofactor_setup_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.ADMINISTRATOR)
    api_client.force_authenticate(user=user)
    url = "/api/v1/auth/2fa/setup/"

    for _ in range(5):
        response = api_client.post(url)
        assert response.status_code == 200

    response = api_client.post(url)
    assert response.status_code == 429


@pytest.mark.django_db
def test_twofactor_verify_setup_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.ADMINISTRATOR)
    api_client.force_authenticate(user=user)
    api_client.post("/api/v1/auth/2fa/setup/")

    url = "/api/v1/auth/2fa/verify-setup/"
    payload = {"token": "000000"}

    for _ in range(5):
        response = api_client.post(url, payload)
        assert response.status_code == 400

    response = api_client.post(url, payload)
    assert response.status_code == 429


@pytest.mark.django_db
def test_solicitar_alteracao_senha_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.CATALOGUER)
    api_client.force_authenticate(user=user)
    url = "/api/v1/auth/solicitar-senha/"
    payload = {"nova_senha": "NovaSenhaForte123"}

    for _ in range(3):
        response = api_client.post(url, payload)
        assert response.status_code == 200

    response = api_client.post(url, payload)
    assert response.status_code == 429
```

Note: `User` import is missing above; add `from apps.users.models import User` at the top.

Corrected top of file:

```python
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.models import User
from apps.users.tests.factories import UserFactory
```

- [ ] **Step 2: Run the new tests**

Run:

```bash
cd /opt/cavn-digital/backend
source .venv-linux/bin/activate
pytest apps/users/tests/test_ratelimit.py -q
```

Expected: all tests pass.

- [ ] **Step 3: Run full backend test suite**

Run:

```bash
cd /opt/cavn-digital/backend
pytest -q
```

Expected: `91 passed` plus new tests (≥91).

- [ ] **Step 4: Commit**

```bash
cd /opt/cavn-digital
git add backend/apps/users/tests/test_ratelimit.py
git commit -m "test(users): add rate-limit tests for auth and 2FA"
```

---

### Task 5: Remove XSS vector in TwoFactorSetup

**Files:**
- Modify: `frontend/src/features/auth/components/TwoFactorSetup.tsx`

**Interfaces:**
- Consumes: `qrCodeSvg` string from API.
- Produces: `qrCodeSvg` rendered as base64 `<img>` with safe alt text.

- [ ] **Step 1: Add helper function**

At the top of the component file (after imports), add:

```typescript
function svgToBase64PngUrl(svg: string): string {
  // O backend já gera SVG seguro, mas nunca confiamos em HTML injetado.
  // Convertemos para uma URL de dados base64, que o navegador trata como imagem,
  // eliminando a superfície de XSS do dangerouslySetInnerHTML.
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}
```

- [ ] **Step 2: Replace dangerous render**

Find:

```tsx
<div
  className="mx-auto w-56"
  dangerouslySetInnerHTML={{ __html: data.qrCodeSvg }}
/>
```

Replace with:

```tsx
<img
  src={svgToBase64PngUrl(data.qrCodeSvg)}
  alt="QR code para configurar autenticação de dois fatores"
  className="mx-auto w-56"
/>
```

- [ ] **Step 3: Run lint and unit tests**

Run:

```bash
cd /opt/cavn-digital/frontend
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /opt/cavn-digital
git add frontend/src/features/auth/components/TwoFactorSetup.tsx
git commit -m "feat(auth): render 2FA QR code as base64 image instead of raw HTML"
```

---

### Task 6: Add CSP meta tag to index.html

**Files:**
- Modify: `frontend/index.html`

**Interfaces:**
- Consumes: existing Bunny Fonts link and inline styles.
- Produces: `<meta http-equiv="Content-Security-Policy">` aligned with backend CSP.

- [ ] **Step 1: Add CSP meta tag**

After the `<meta name="language" ...>` line in `frontend/index.html`, add:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline' https://fonts.bunny.net;
    img-src 'self' data: blob:;
    font-src 'self' https://fonts.bunny.net;
    connect-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
    media-src 'self';
  "
/>
```

Keep the value on one logical line or use the multi-line format above; HTML ignores the newlines inside the attribute value.

- [ ] **Step 2: Build frontend to verify CSP does not break anything**

Run:

```bash
cd /opt/cavn-digital/frontend
npm run build
```

Expected: build succeeds with no CSP-related errors.

- [ ] **Step 3: Commit**

```bash
cd /opt/cavn-digital
git add frontend/index.html
git commit -m "feat(frontend): add Content-Security-Policy meta tag"
```

---

### Task 7: Remove localStorage persistence from authStore

**Files:**
- Modify: `frontend/src/features/auth/stores/authStore.ts`
- Modify: `frontend/src/features/auth/stores/authStore.test.ts`

**Interfaces:**
- Consumes: Zustand `create`.
- Produces: `useAuthStore` without `persist`; auth state lives only in memory.

- [ ] **Step 1: Refactor the store**

Replace the entire contents of `frontend/src/features/auth/stores/authStore.ts` with:

```typescript
import { create } from 'zustand';
import { Usuario, PerfilUsuario } from '@/shared/types';

interface AuthState {
  user: Usuario | null;
  setAuth: (user: Usuario) => void;
  logout: () => void;
  hasRole: (roles: PerfilUsuario[]) => boolean;
}

interface AuthSelectors {
  /** Derivado de user — nunca armazenado separadamente. */
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  setAuth: (user) => {
    set({ user });
  },
  logout: () => {
    set({ user: null });
  },
  hasRole: (roles) => {
    const user = get().user;
    if (!user) return false;
    const userRoles = user.perfis && user.perfis.length > 0 ? user.perfis : [user.perfil];
    return roles.some((role) => userRoles.includes(role));
  },
}));

/** Hook que inclui isAuthenticated derivado do user, sem armazenar booleano separado. */
export function useAuthStoreWithSelectors(): AuthState & AuthSelectors {
  const state = useAuthStore();
  return { ...state, isAuthenticated: state.user !== null };
}
```

- [ ] **Step 2: Update the test**

In `frontend/src/features/auth/stores/authStore.test.ts`, replace the last test:

```typescript
  it('não persiste user no localStorage', () => {
    const { result } = renderHook(() => useAuthStoreWithSelectors());
    act(() => result.current.setAuth(userFixture));
    expect(localStorage.getItem('cavn-auth')).toBeNull();
  });
```

Remove the old test:

```typescript
  it('isAuthenticated não é persistido no localStorage', () => {
    const persisted = JSON.parse(localStorage.getItem('cavn-auth') || '{"state":{}}');
    expect(persisted.state).not.toHaveProperty('isAuthenticated');
  });
```

- [ ] **Step 3: Run frontend tests**

Run:

```bash
cd /opt/cavn-digital/frontend
npm run test -- --run src/features/auth/stores/authStore.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /opt/cavn-digital
git add frontend/src/features/auth/stores/authStore.ts frontend/src/features/auth/stores/authStore.test.ts
git commit -m "feat(auth): keep auth state in memory only, remove localStorage persistence"
```

---

### Task 8: Standardize TanStack Query keys

**Files:**
- Modify: `frontend/src/shared/hooks/useDocuments.ts`
- Modify: `frontend/src/shared/hooks/useSearch.ts`

**Interfaces:**
- Consumes: `SearchFilters` type.
- Produces: deterministic `queryKey` arrays for server-state invalidation.

- [ ] **Step 1: Update useDocuments**

Replace the `useDocuments` function in `frontend/src/shared/hooks/useDocuments.ts` with:

```typescript
export function useDocuments(filters: SearchFilters & { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['documents', 'list', filters],
    queryFn: async () => {
      const params = buildSearchParams(filters);
      const response = await api.get<PaginatedResponse<Documento>>(
        `/documentos/?${params.toString()}`
      );
      return response.data;
    },
  });
}
```

- [ ] **Step 2: Update useSearch**

Replace the `queryKey` line in `frontend/src/shared/hooks/useSearch.ts` with:

```typescript
    queryKey: ['documents', 'search', { ...filters, q: debouncedQuery }],
```

- [ ] **Step 3: Run frontend tests**

Run:

```bash
cd /opt/cavn-digital/frontend
npm run test -- --run
```

Expected: all 53 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /opt/cavn-digital
git add frontend/src/shared/hooks/useDocuments.ts frontend/src/shared/hooks/useSearch.ts
git commit -m "refactor(query): standardize queryKey arrays for documents and search"
```

---

### Task 9: Fix E2E tests

**Files:**
- Modify: `frontend/e2e/fluxo-completo.spec.ts`

**Interfaces:**
- Consumes: existing Playwright fixtures and mock data.
- Produces: deterministic tests using state assertions.

- [ ] **Step 1: Remove fixed timeouts from navigation tests**

Update the first test to:

```typescript
  test('Fluxo completo: Home → Lista de documentos → Detalhe do documento', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();

    await page.goto('/busca');
    await expect(page).toHaveURL(/\/busca/);

    const docLink = page.locator(`a[href*="/documentos/${MOCK_DOCUMENTS[0].slug}"]`).first();
    await expect(docLink).toBeVisible();
    await docLink.click();
    await expect(page).toHaveURL(new RegExp(MOCK_DOCUMENTS[0].slug));
    await expect(page.locator('body')).toContainText(MOCK_DOCUMENTS[0].titulo);
  });
```

- [ ] **Step 2: Fix search tests**

Update:

```typescript
  test('Fluxo completo: Busca por termo encontra resultados', async ({ page }) => {
    await page.goto('/busca?q=Fundação');
    await expect(page.locator('body')).toContainText(/Fundaç[ãa]o/);
  });

  test('Fluxo completo: Busca sem resultados exibe mensagem', async ({ page }) => {
    await page.goto('/busca?q=ZZZZNaoExiste9999');
    await expect(page.locator('body')).toContainText(/nenhum resultado|não encontramos/i);
  });
```

If the empty-search message regex does not match the actual UI text, adjust after running.

- [ ] **Step 3: Fix public pages navigation**

Update:

```typescript
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
      await expect(page.locator('body')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`(${path}|/login)`));
    }
  });
```

- [ ] **Step 4: Fix login test**

Update:

```typescript
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

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill('admin@cavn.ufpb.br');
    await page.locator('input[type="password"]').first().fill('Senha@Forte123');
    await page.locator('button[type="submit"]').first().click();

    await expect(page).toHaveURL(/\/admin/);
  });
```

- [ ] **Step 5: Fix remaining tests**

Update admin redirect test:

```typescript
  test('Fluxo completo: Acessar área admin sem auth é redirecionado para login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
```

Update privacy/terms tests (remove timeouts):

```typescript
  test('Fluxo completo: Política de privacidade carrega', async ({ page }) => {
    await page.goto('/politica-de-privacidade');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Fluxo completo: Termo de uso carrega', async ({ page }) => {
    await page.goto('/termo-de-uso');
    await expect(page.locator('body')).toBeVisible();
  });
```

Update timeline test (remove always-true assertion):

```typescript
  test('Fluxo completo: Timeline exibe eventos', async ({ page }) => {
    await page.goto('/linha-do-tempo');
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    const foundEvent = MOCK_TIMELINE.some((e) => bodyText.includes(e.titulo));
    expect(foundEvent).toBe(true);
  });
```

- [ ] **Step 6: Verify no waitForTimeout remains**

Run:

```bash
cd /opt/cavn-digital/frontend
grep -n "waitForTimeout" e2e/fluxo-completo.spec.ts
```

Expected: no output.

- [ ] **Step 7: Run E2E tests**

Run:

```bash
cd /opt/cavn-digital/frontend
npx playwright test
```

Expected: all tests pass. If any fail due to UI text mismatches, adjust regexes/assertions and rerun.

- [ ] **Step 8: Commit**

```bash
cd /opt/cavn-digital
git add frontend/e2e/fluxo-completo.spec.ts
git commit -m "test(e2e): replace fixed timeouts with state assertions"
```

---

### Task 10: Final validation

**Files:** all modified files.

- [ ] **Step 1: Run backend lint and tests**

```bash
cd /opt/cavn-digital/backend
source .venv-linux/bin/activate
ruff check apps config
pytest -q
```

Expected: `All checks passed!` and all tests pass.

- [ ] **Step 2: Run frontend lint, tests, and build**

```bash
cd /opt/cavn-digital/frontend
npm run lint
npm run test -- --run
npm run build
```

Expected: all pass.

- [ ] **Step 3: Optional — run E2E tests**

```bash
cd /opt/cavn-digital/frontend
npx playwright test
```

Expected: all pass.

- [ ] **Step 4: Review git log**

Run:

```bash
cd /opt/cavn-digital
git log --oneline -10
```

Expected: one commit per task with clear messages.

- [ ] **Step 5: Update todo list and report completion**

Mark all Fase 1 tasks done and summarize changes to the user.

---

## Spec Coverage Check

| Spec Requirement | Implementing Task |
|---|---|
| Rate limiting em login | Task 2 |
| Rate limiting em 2FA setup/verify/disable/login | Task 3 |
| Rate limiting em refresh | Task 2 |
| Rate limiting em alterar/solicitar senha | Task 2 |
| Testes de rate limiting | Task 4 |
| Remover `dangerouslySetInnerHTML` do QR code | Task 5 |
| Adicionar CSP no `index.html` | Task 6 |
| Corrigir E2E | Task 9 |
| Remover persistência `localStorage` do authStore | Task 7 |
| Padronizar `queryKey` | Task 8 |
| CI continua verde | Task 10 |

## Placeholder Scan

- No "TBD", "TODO", "implement later".
- No vague instructions such as "add appropriate error handling".
- All code blocks contain concrete, copy-pasteable code.
- All commands have expected outputs.

## Type Consistency Check

- `drf_ratelimit` signature is consistent across Task 1, 2, and 3.
- `RateLimitedMixin` attributes match usage in Task 2.
- `useAuthStore` interface remains the same (`user`, `setAuth`, `logout`, `hasRole`); consumers are unaffected.
- `queryKey` arrays use serializable objects consistently.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-04-fase1-quick-wins-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you prefer?
