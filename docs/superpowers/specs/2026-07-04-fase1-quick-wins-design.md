# Design: Fase 1 — Quick Wins de Maturidade Enterprise

**Projeto:** Repositório Digital CAVN
**Data:** 2026-07-04
**Escopo:** Opção A — Quick Wins enxutos e seguros
**Status:** Proposta para aprovação

---

## 1. Contexto

A auditoria de maturidade identificou lacunas operacionais que separam o sistema de um padrão enterprise. A Fase 1 foca em correções de baixo risco e alto impacto em segurança, qualidade de testes e consistência do frontend, sem alterar arquitetura ou fluxos de negócio.

## 2. Objetivo

Eliminar os problemas críticos mais fáceis de corrigir da Fase 1 do roadmap:

1. Rate limiting em 2FA e endpoints de autenticação.
2. Vetor XSS no setup de 2FA e ausência de CSP no frontend.
3. Testes E2E frágeis e com assertions inúteis.
4. Persistência de dados de perfil no `localStorage`.
5. Inconsistência de `queryKey` no TanStack Query.

## 3. Escopo

### Incluído

- Backend (`/opt/cavn-digital/backend`):
  - Aplicar `django-ratelimit`/`throttling` nas views de 2FA e auth.
  - Adicionar/atualizar testes unitários para rate limiting.
- Frontend (`/opt/cavn-digital/frontend`):
  - Refatorar `TwoFactorSetup.tsx` para não usar `dangerouslySetInnerHTML`.
  - Adicionar meta tag CSP em `index.html`.
  - Remover persistência `localStorage` de `authStore.ts`.
  - Padronizar `queryKey` de `useDocuments.ts` e `useSearch.ts`.
  - Corrigir E2E (`fluxo-completo.spec.ts`).
- CI:
  - Garantir que lint e testes continuem passando.

### Excluído

- Invalidação de cache por signals (Fase 2).
- Correções de N+1 e paginação (Fase 2).
- CD/rollback e refatorações DevOps (Fase 2/3).
- i18n, CDN, OG images (Fase 3).

## 4. Mudanças Detalhadas

### 4.1 Rate limiting em 2FA e autenticação

**Motivação:** tokens TOTP de 6 dígitos permitem brute-force se não houver throttling.

**Implementação:**
- Utilizar `django_ratelimit.decorators.ratelimit` nas views sensíveis de `apps/users/views.py` e `apps/users/twofactor.py`.
- Limites sugeridos:
  - login: 5 requisições / minuto por IP.
  - 2FA setup/verify/disable: 5 requisições / minuto por IP.
  - refresh token: 10 requisições / minuto por IP.
  - solicitação de alteração de senha: 3 requisições / hora por IP.
- Retornar HTTP 429 com mensagem genérica de "muitas tentativas".
- Adicionar testes que verifiquem o bloqueio após o limite.

**Arquivos afetados:**
- `backend/apps/users/views.py`
- `backend/apps/users/twofactor.py`
- `backend/apps/users/tests/test_twofactor.py`
- `backend/apps/users/tests/test_auth.py` (se existir)

### 4.2 Remover vetor XSS no 2FA

**Motivação:** `dangerouslySetInnerHTML={{ __html: data.qrCodeSvg }}` renderiza SVG vindo do backend; se o backend for comprometido, é vetor de XSS.

**Implementação:**
- Converter o SVG recebido em imagem base64 e renderizar com `<img src="data:image/svg+xml;base64,..." alt="QR code para 2FA" />`.
- Remover importações/dependências não utilizadas.

**Arquivo afetado:**
- `frontend/src/features/auth/components/TwoFactorSetup.tsx`

### 4.3 Adicionar CSP no `index.html`

**Motivação:** o frontend SPA não possui Content-Security-Policy, reduzindo a defesa contra XSS.

**Implementação:**
- Adicionar `<meta http-equiv="Content-Security-Policy" content="...">` em `frontend/index.html`.
- Política alinhada com a CSP do backend:
  - `default-src 'self'`
  - `script-src 'self'`
  - `style-src 'self' 'unsafe-inline' https://fonts.bunny.net`
  - `img-src 'self' data: blob:`
  - `font-src 'self' https://fonts.bunny.net`
  - `connect-src 'self'`
  - `frame-ancestors 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`

**Arquivo afetado:**
- `frontend/index.html`

### 4.4 Corrigir testes E2E

**Motivação:** `waitForTimeout` fixos e `expect(foundEvent || true).toBeTruthy()` mascaram falhas.

**Implementação:**
- Substituir `page.waitForTimeout()` por asserções de estado (`expect(...).toBeVisible()`, `toHaveURL`, etc.).
- Corrigir `expect(foundEvent || true).toBeTruthy()` para `expect(foundEvent).toBe(true)`.
- Garantir que interceptações de API retornem dados consistentes.

**Arquivo afetado:**
- `frontend/e2e/fluxo-completo.spec.ts`

### 4.5 Remover persistência de perfil no `localStorage`

**Motivação:** dados de perfil do usuário não devem persistir em storage local compartilhável.

**Implementação:**
- Remover `persist` do Zustand em `authStore.ts`.
- Manter o estado apenas em memória; a autenticação real continua via cookie `httpOnly`.
- Ajustar testes unitários do store se necessário.

**Arquivo afetado:**
- `frontend/src/features/auth/stores/authStore.ts`
- `frontend/src/features/auth/stores/authStore.test.ts`

### 4.6 Padronizar `queryKey` do TanStack Query

**Motivação:** inconsistência entre `JSON.stringify(filters)` e objeto dificulta invalidação precisa.

**Implementação:**
- Adotar padrão de array de chaves em todos os hooks de server state.
- Exemplo: `['documents', 'list', filters]` e `['search', filters]`.
- Garantir que `filters` seja serializável de forma determinística (ex: chaves ordenadas).

**Arquivos afetados:**
- `frontend/src/shared/hooks/useDocuments.ts`
- `frontend/src/shared/hooks/useSearch.ts`

## 5. Testes

- Backend: todos os testes existentes devem continuar passando; adicionar testes para rate limiting.
- Frontend: todos os testes unitários e de componentes devem continuar passando.
- E2E: devem passar sem `waitForTimeout` e com assertions válidas.
- CI: `ruff check`, `pytest`, `npm run lint`, `npm run test -- --run`, `npm run build`.

## 6. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Rate limit pode bloquear usuários legítimos em NAT corporativo | Limites por IP são permissivos (5/min); em caso de problema, podem ser ajustados via variável de ambiente. |
| CSP pode quebrar recursos externos | Política inicial usa `'unsafe-inline'` para styles e permite Bunny Fonts; validar via CI build. |
| Remover `localStorage` do authStore pode afetar UX | O perfil é recarregado via `/auth/me/`; autenticação continua em cookie `httpOnly`. |
| Mudanças em E2E podem falhar em CI | Executar Playwright localmente e no CI; usar asserções de estado. |

## 7. Critérios de Aceitação

- [ ] Rate limiting retorna HTTP 429 após excesso de tentativas em login, 2FA setup/verify/disable, refresh e solicitação de senha.
- [ ] `TwoFactorSetup.tsx` não usa `dangerouslySetInnerHTML`.
- [ ] `index.html` possui meta tag CSP.
- [ ] Nenhum `waitForTimeout` em `fluxo-completo.spec.ts`; assertions são significativas.
- [ ] `authStore.ts` não persiste em `localStorage`.
- [ ] `useDocuments.ts` e `useSearch.ts` usam `queryKey` padronizado.
- [ ] CI passa: backend 91+ testes, frontend 53+ testes, lint e build verdes.

## 8. Próximos Passos

Após aprovação deste design, invocar a skill `writing-plans` para criar o plano de implementação detalhado.
