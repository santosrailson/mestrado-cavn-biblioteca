# Fase 2 — Hardening de Segurança, Testes e Operação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as lacunas de maturidade identificadas na auditoria de 2026-07-04 do Repositório Digital CAVN: uma falha de autorização real (IDOR), um bug que quebra a exclusão de arquivos, CSP anulada pelo Nginx, 2FA não aplicado ao admin, testes E2E que sempre passam sem validar nada, cobertura de testes não medida, auditoria incompleta, e uma série de gaps de UX/operação no frontend e na infraestrutura.

**Architecture:** Cada task corrige um gap isolado e é testável de forma independente — não há uma "feature" nova sendo construída, e sim uma série de correções cirúrgicas em código já existente. As tasks de segurança (1-5) vêm primeiro por serem as de maior risco; testes (6-11) em seguida para que as correções de segurança fiquem protegidas por regressão; depois auditoria/PII (12-13), frontend (14-17) e operação/docs (18-23).

**Tech Stack:** Django 5.2 + DRF + pytest-django + factory-boy (backend); React 18 + TypeScript + Vitest + Playwright (frontend); Nginx + Docker Compose (infra).

## Global Constraints

- Mensagens de commit seguem Conventional Commits já usado no repo: `fix:`, `feat:`, `test:`, `security:`, `docs:`, `ci:`, `refactor:`.
- Todo texto voltado ao usuário (mensagens de erro, labels, verbose_name) é em português.
- Backend: Ruff line-length 100, regras `E,F,I,N,W,UP,B,C4,SIM` (`backend/pyproject.toml`). Rodar `ruff check apps config` antes de commitar.
- Testes backend: pytest-django, `@pytest.mark.django_db`, `APIClient` do DRF — nunca mockar o ORM (padrão já estabelecido em `documents/tests/test_permissions.py`).
- Testes E2E: usar `page.route()` para interceptar a API, como em `frontend/e2e/fluxo-completo.spec.ts` — nunca depender de dados reais de um backend rodando.
- Não introduzir novas dependências além das explicitamente listadas em cada task (`pytest-cov`, `@vitest/coverage-v8`, `pre-commit`) — sem migração de i18n, ClamAV, ou pgbouncer nesta fase (adiado deliberadamente).
- Rodar os testes existentes (`pytest -q` no backend, `npm run test -- --run` no frontend) antes de cada commit para garantir que nada quebrou.

---

### Task 1: Corrigir bug que quebra a exclusão de arquivos (`AttributeError`)

`ArquivoViewSet.perform_destroy` (`backend/apps/documents/views.py:277-282`) chama `user.can_edit_document(documento)` — método que **não existe em lugar nenhum do código** (`apps/users/models.py` só define `can_moderate`, `can_catalogue`, `can_administer`). Toda tentativa de excluir um arquivo (`DELETE /api/v1/documentos/arquivos/{id}/`) por qualquer usuário autorizado gera `AttributeError` não tratado (500), quebrando a funcionalidade por completo. A correção correta é reusar a permission class `CanEditDocument` já existente, em vez de inventar um método novo.

**Files:**
- Modify: `backend/apps/documents/views.py:277-282`
- Test: `backend/apps/documents/tests/test_permissions.py`

**Interfaces:**
- Consumes: `CanEditDocument` (já importado em `views.py`, definida em `apps/documents/permissions.py:19-30`), tem o método `has_object_permission(request, view, obj) -> bool`.
- Produces: nenhuma interface nova — corrige comportamento existente.

- [ ] **Step 1: Escrever o teste que expõe o bug (deve falhar com 500, não com o assert)**

Adicionar ao final de `backend/apps/documents/tests/test_permissions.py`:

```python
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import Arquivo


@pytest.mark.django_db
class TestArquivoDeletePermission:
    def test_owner_can_delete_own_file(self, api_client):
        owner = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Doc com Arquivo", status=DocumentStatus.DRAFT, created_by=owner
        )
        arquivo = Arquivo.objects.create(
            documento=doc,
            arquivo=SimpleUploadedFile("a.txt", b"conteudo de teste"),
            tipo_arquivo="original",
        )
        api_client.force_authenticate(user=owner)
        response = api_client.delete(f"/api/v1/documentos/arquivos/{arquivo.pk}/")
        assert response.status_code == 204
        assert not Arquivo.objects.filter(pk=arquivo.pk).exists()

    def test_cataloguer_cannot_delete_others_file(self, api_client):
        owner = UserFactory(role=UserRole.CATALOGUER)
        attacker = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Doc Alheio", status=DocumentStatus.DRAFT, created_by=owner
        )
        arquivo = Arquivo.objects.create(
            documento=doc,
            arquivo=SimpleUploadedFile("a.txt", b"conteudo de teste"),
            tipo_arquivo="original",
        )
        api_client.force_authenticate(user=attacker)
        response = api_client.delete(f"/api/v1/documentos/arquivos/{arquivo.pk}/")
        assert response.status_code == 403
        assert Arquivo.objects.filter(pk=arquivo.pk).exists()
```

- [ ] **Step 2: Rodar os testes e confirmar que falham (500 em vez do esperado)**

Run: `cd backend && pytest apps/documents/tests/test_permissions.py::TestArquivoDeletePermission -v`
Expected: `test_owner_can_delete_own_file` FAIL com `AttributeError: 'User' object has no attribute 'can_edit_document'` propagado como 500.

- [ ] **Step 3: Corrigir `perform_destroy` para reusar `CanEditDocument`**

Em `backend/apps/documents/views.py`, substituir (linhas 277-282):

```python
    def perform_destroy(self, instance):
        documento = instance.documento
        user = self.request.user
        if not user.can_edit_document(documento):
            raise PermissionDenied("Você não tem permissão para remover este arquivo.")
        instance.delete()
```

por:

```python
    def perform_destroy(self, instance):
        documento = instance.documento
        if not CanEditDocument().has_object_permission(self.request, self, documento):
            raise PermissionDenied("Você não tem permissão para remover este arquivo.")
        instance.delete()
```

Confirmar que `CanEditDocument` já está no bloco de imports de `views.py` (já é usado em `get_permissions`, linha 269) — nenhum import novo necessário.

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd backend && pytest apps/documents/tests/test_permissions.py -v`
Expected: PASS em todos os testes da classe, incluindo os dois novos.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/documents/views.py backend/apps/documents/tests/test_permissions.py
git commit -m "fix(documents): corrige AttributeError que quebrava exclusão de arquivos"
```

---

### Task 2: Corrigir IDOR em `ArquivoViewSet.create`

`ArquivoViewSet.get_permissions()` (`views.py:267-271`) usa `CanEditDocument`, mas essa classe só implementa `has_object_permission` — nunca invocada em `create`, pois não há objeto ainda nesse ponto. Qualquer usuário autenticado pode fazer `POST /api/v1/documentos/arquivos/` anexando um arquivo a **qualquer** documento (`documento=<uuid>`), inclusive de terceiros, sem checagem de posse.

**Files:**
- Modify: `backend/apps/documents/views.py:273-275`
- Test: `backend/apps/documents/tests/test_permissions.py`

**Interfaces:**
- Consumes: `serializer.validated_data["documento"]` (instância de `Document`, já resolvida pelo `PrimaryKeyRelatedField` do DRF antes de `perform_create` ser chamado); `request.user.can_edit_document` — **não existe** (ver Task 1) — usar `CanEditDocument().has_object_permission` em vez disso, mesma correção.
- Produces: nenhuma interface nova.

- [ ] **Step 1: Escrever os testes de regressão do IDOR**

Adicionar ao final de `backend/apps/documents/tests/test_permissions.py` (na mesma classe `TestArquivoDeletePermission` criada na Task 1, renomeada para cobrir criação e exclusão — ver Step 3):

```python
    def test_cataloguer_cannot_attach_file_to_others_document(self, api_client):
        owner = UserFactory(role=UserRole.CATALOGUER)
        attacker = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Documento Alheio", status=DocumentStatus.DRAFT, created_by=owner
        )
        api_client.force_authenticate(user=attacker)
        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(doc.pk),
                "arquivo": SimpleUploadedFile("teste.txt", b"conteudo malicioso"),
                "tipo_arquivo": "original",
            },
            format="multipart",
        )
        assert response.status_code == 403
        assert not Arquivo.objects.filter(documento=doc).exists()

    def test_owner_can_attach_file_to_own_draft(self, api_client):
        owner = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Meu Documento", status=DocumentStatus.DRAFT, created_by=owner
        )
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(doc.pk),
                "arquivo": SimpleUploadedFile("teste.txt", b"conteudo legitimo"),
                "tipo_arquivo": "original",
            },
            format="multipart",
        )
        assert response.status_code == 201
        assert Arquivo.objects.filter(documento=doc).exists()
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd backend && pytest apps/documents/tests/test_permissions.py -k "attach_file" -v`
Expected: `test_cataloguer_cannot_attach_file_to_others_document` FAIL — a criação retorna 201 em vez de 403 (o attacker consegue anexar o arquivo).

- [ ] **Step 3: Adicionar checagem de posse em `perform_create`**

Em `backend/apps/documents/views.py`, substituir (linhas 273-275):

```python
    def perform_create(self, serializer):
        arquivo = serializer.save()
        processar_arquivo_async.delay(str(arquivo.pk))
```

por:

```python
    def perform_create(self, serializer):
        documento = serializer.validated_data.get("documento")
        if not CanEditDocument().has_object_permission(self.request, self, documento):
            raise PermissionDenied(
                "Você não tem permissão para adicionar arquivos a este documento."
            )
        arquivo = serializer.save()
        processar_arquivo_async.delay(str(arquivo.pk))
```

`PermissionDenied` já está importado em `views.py` (usado em `perform_destroy`).

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd backend && pytest apps/documents/tests/test_permissions.py -v`
Expected: PASS em todos os testes, incluindo os dois novos.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/documents/views.py backend/apps/documents/tests/test_permissions.py
git commit -m "security(documents): corrige IDOR que permitia anexar arquivo a documento de terceiros"
```

---

### Task 3: Corrigir CSP anulada pelo Nginx

`backend/config/settings.py:528-540` define uma CSP estrita via `django-csp` (`CSP_SCRIPT_SRC = ("'self'",)`, sem `unsafe-inline`), mas `nginx/host-nginx.conf:71` define seu próprio header `Content-Security-Policy` com `'unsafe-inline'` em `script-src`/`style-src`, e cada `location` que faz proxy para o backend (`/api/v1/auth/*`, `/api/v1/analytics/vitals/`, `/api/v1|gerencia`, e o frontend `/`) executa `proxy_hide_header Content-Security-Policy` — descartando a política do Django e entregando ao navegador apenas a política mais permissiva do Nginx. O frontend já tem sua própria meta tag CSP em `frontend/index.html:10-24` (mais estrita, sem `unsafe-inline` em `script-src`) que serve de política real para a SPA — o header do Nginx nessa rota é redundante e desalinhado.

**Files:**
- Modify: `nginx/host-nginx.conf`

**Interfaces:** N/A (configuração de infraestrutura, sem interface de código).

- [ ] **Step 1: Remover o header CSP genérico do bloco `server` e as diretivas que o escondem**

Em `nginx/host-nginx.conf`, remover a linha 71 inteira:

```nginx
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.bunny.net; img-src 'self' data: blob:; font-src 'self' https://fonts.bunny.net; connect-src 'self' https://fonts.bunny.net https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; media-src 'self';" always;
```

E remover a linha `proxy_hide_header Content-Security-Policy;` de cada um dos 4 locations que a contêm:
- Location `~ ^/api/v1/auth/(login|refresh|token)/` (linha 152)
- Location `= /api/v1/analytics/vitals/` (linha 171)
- Location `~ ^/(api/v1|gerencia)/` (linha 193)
- Location `/` — frontend SPA (linha 206)

Resultado esperado: para as três primeiras locations (proxied ao backend Django), o header `Content-Security-Policy` computado por `django-csp` a partir de `CSP_*` em `settings.py` passa a chegar intacto ao navegador. Para a location `/` (frontend estático), nenhum header CSP é mais injetado pelo Nginx — a meta tag já presente em `frontend/index.html` continua sendo a política efetiva da SPA, sem duplicidade/conflito.

- [ ] **Step 2: Validar a sintaxe do Nginx**

Run (na VPS de produção, via SSH — não é possível validar localmente neste ambiente): `sudo nginx -t`
Expected: `syntax is ok` / `test is successful`.

- [ ] **Step 3: Recarregar e verificar os headers efetivos**

Run: `sudo systemctl reload nginx`, depois:
```bash
curl -sI https://bibliotecadigital.cchsa-cavn.tec.br/api/v1/health/ | grep -i content-security-policy
curl -sI https://bibliotecadigital.cchsa-cavn.tec.br/ | grep -i content-security-policy
```
Expected: a primeira chamada deve mostrar a CSP estrita do Django (`script-src 'self'`, sem `unsafe-inline`); a segunda não deve ter header `Content-Security-Policy` (a proteção vem da meta tag do HTML).

- [ ] **Step 4: Verificar manualmente que o Django Admin (`/gerencia/`) e o frontend continuam funcionando**

Acessar `/gerencia/` logado e navegar por 2-3 telas do django-unfold (listagem, formulário de edição), e abrir o console do navegador (F12) checando se há erros de CSP bloqueando scripts/estilos do admin. Se o Unfold precisar de `unsafe-inline` para algum recurso específico, ajustar `CSP_SCRIPT_SRC`/`CSP_STYLE_SRC` em `backend/config/settings.py:528-540` de forma pontual (não reintroduzir o header do Nginx).

- [ ] **Step 5: Commit**

```bash
git add nginx/host-nginx.conf
git commit -m "security(nginx): remove CSP permissiva do Nginx que anulava a política estrita do Django"
```

---

### Task 4: Exigir verificação 2FA no Django Admin para quem já tem dispositivo configurado

O `django_otp`/`OTPMiddleware` já roda (`settings.py:114`), mas nada no admin exige `request.user.is_verified()`. Um staff com 2FA configurado (`TOTPDevice.objects.filter(user=user, confirmed=True)`) ainda entra no admin só com email+senha — inconsistente com o login da API (`CustomTokenObtainPairView`, `apps/users/views.py:108-125`), que já exige o desafio 2FA quando existe dispositivo confirmado. A correção espelha essa mesma regra no admin, sem travar quem ainda não configurou 2FA.

**Files:**
- Create: `backend/apps/core/admin_site.py`
- Modify: `backend/apps/core/apps.py`
- Test: `backend/apps/core/tests/test_admin_site.py`

**Interfaces:**
- Consumes: `django_otp.forms.OTPAuthenticationForm`, `django_otp.plugins.otp_totp.models.TOTPDevice`, `django_otp.DEVICE_ID_SESSION_KEY`.
- Produces: `install_conditional_otp_admin()` — função sem argumentos, chamada em `CoreConfig.ready()`.

- [ ] **Step 1: Escrever o teste (deve falhar por enquanto: `admin.site` ainda não é `ConditionalOTPAdminSite`)**

Criar `backend/apps/core/tests/test_admin_site.py`:

```python
import pytest
from django.urls import reverse
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestConditionalOTPAdmin:
    def test_admin_without_2fa_device_can_access(self, client):
        admin_user = UserFactory(
            role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True
        )
        client.force_login(admin_user)
        response = client.get(reverse("admin:index"))
        assert response.status_code == 200

    def test_admin_with_unconfirmed_device_can_access(self, client):
        admin_user = UserFactory(
            role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True
        )
        TOTPDevice.objects.create(user=admin_user, name="default", confirmed=False)
        client.force_login(admin_user)
        response = client.get(reverse("admin:index"))
        assert response.status_code == 200

    def test_admin_with_confirmed_device_blocked_until_verified(self, client):
        admin_user = UserFactory(
            role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True
        )
        TOTPDevice.objects.create(user=admin_user, name="default", confirmed=True)
        client.force_login(admin_user)
        response = client.get(reverse("admin:index"))
        assert response.status_code == 302
        assert reverse("admin:login") in response.url

    def test_admin_with_verified_device_can_access(self, client):
        admin_user = UserFactory(
            role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True
        )
        device = TOTPDevice.objects.create(user=admin_user, name="default", confirmed=True)
        client.force_login(admin_user)
        session = client.session
        session[DEVICE_ID_SESSION_KEY] = device.persistent_id
        session.save()
        response = client.get(reverse("admin:index"))
        assert response.status_code == 200
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd backend && pytest apps/core/tests/test_admin_site.py -v`
Expected: `test_admin_with_confirmed_device_blocked_until_verified` FAIL — hoje retorna 200 (sem bloqueio nenhum).

- [ ] **Step 3: Criar o `AdminSite` condicional**

Criar `backend/apps/core/admin_site.py`:

```python
"""AdminSite customizado que exige verificação 2FA apenas de staff com dispositivo confirmado."""

from django.contrib import admin
from django_otp.forms import OTPAuthenticationForm
from django_otp.plugins.otp_totp.models import TOTPDevice


class ConditionalOTPAdminSite(admin.AdminSite):
    """Espelha a regra de 2FA do login da API (CustomTokenObtainPairView): só exige
    verificação OTP de staff que já configurou um dispositivo confirmado, evitando
    bloquear acidentalmente quem ainda não ativou o 2FA.
    """

    login_form = OTPAuthenticationForm

    def has_permission(self, request):
        if not super().has_permission(request):
            return False
        has_device = TOTPDevice.objects.filter(
            user=request.user, confirmed=True
        ).exists()
        if has_device and not request.user.is_verified():
            return False
        return True


def install_conditional_otp_admin():
    """Substitui a classe da instância padrão de admin.site pela variante com 2FA condicional."""
    admin.site.__class__ = ConditionalOTPAdminSite
```

- [ ] **Step 4: Ativar no `ready()` do app `core`**

Modificar `backend/apps/core/apps.py`:

```python
from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = _("Núcleo")

    def ready(self):
        from apps.core.admin_site import install_conditional_otp_admin

        install_conditional_otp_admin()
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `cd backend && pytest apps/core/tests/test_admin_site.py -v`
Expected: PASS em todos os 4 testes.

- [ ] **Step 6: Rodar a suíte completa para garantir que nenhum outro teste de admin quebrou**

Run: `cd backend && pytest -q`
Expected: todos os testes passando (nenhuma regressão).

- [ ] **Step 7: Verificação manual antes de produção**

Antes de subir esta mudança, testar manualmente com uma conta de staff **sem** 2FA (deve continuar entrando normalmente) e uma conta **com** 2FA configurado (deve ser redirecionada e precisar completar o desafio TOTP). Não subir sem essa validação manual — o risco de bloquear acidentalmente um administrador é real.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/core/admin_site.py backend/apps/core/apps.py backend/apps/core/tests/test_admin_site.py
git commit -m "security(admin): exige verificação 2FA no Django Admin para staff com dispositivo confirmado"
```

---

### Task 5: Exigir `FLOWER_BASIC_AUTH` em produção (fail-fast)

`docker-compose.prod.yml:241` define `FLOWER_BASIC_AUTH: ${FLOWER_BASIC_AUTH}` sem o operador `:?` usado em `DB_PASSWORD`/`REDIS_PASSWORD` — se a variável não estiver no `.env` de produção, o Flower sobe **sem autenticação**. O próprio healthcheck (linha 250) já prevê esse caso (`curl ... -u "$FLOWER_BASIC_AUTH" ... || curl ...` sem auth), confirmando que hoje é um estado silenciosamente aceito.

**Files:**
- Modify: `docker-compose.prod.yml:241`

**Interfaces:** N/A (configuração de infraestrutura).

- [ ] **Step 1: Tornar a variável obrigatória**

Em `docker-compose.prod.yml`, dentro do serviço `flower`, substituir a linha 241:

```yaml
      FLOWER_BASIC_AUTH: ${FLOWER_BASIC_AUTH}
```

por:

```yaml
      FLOWER_BASIC_AUTH: ${FLOWER_BASIC_AUTH:?Defina FLOWER_BASIC_AUTH (usuario:senha) no .env de produção}
```

- [ ] **Step 2: Validar a configuração do compose**

Run: `docker compose -f docker-compose.prod.yml config --quiet`
Expected: sem erro se `FLOWER_BASIC_AUTH` estiver definida no `.env`; erro claro (`Defina FLOWER_BASIC_AUTH...`) se estiver ausente — reproduzir removendo temporariamente a variável do `.env` local de teste e confirmando a mensagem, depois restaurá-la.

- [ ] **Step 3: Atualizar `env-example-prod.txt` para deixar claro que é obrigatória**

Localizar a linha `FLOWER_BASIC_AUTH=` em `env-example-prod.txt` e adicionar/ajustar o comentário acima dela para: `# OBRIGATÓRIA em produção — formato usuario:senha (ex.: admin:$(openssl rand -base64 24))`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.prod.yml env-example-prod.txt
git commit -m "security(flower): exige FLOWER_BASIC_AUTH em produção em vez de subir sem autenticação"
```

---

### Task 6: Medir cobertura de testes do backend

O CI roda `pytest -q` mas nenhuma cobertura é medida — `pytest-cov` não está instalado nem configurado.

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/pytest.ini`
- Modify: `.github/workflows/ci.yml`

**Interfaces:** N/A (configuração de ferramentas).

- [ ] **Step 1: Adicionar `pytest-cov` às dependências de teste**

Em `backend/requirements.txt`, na seção `# Testes`, adicionar logo após `freezegun>=1.4.0`:

```
pytest-cov>=5.0.0
```

- [ ] **Step 2: Configurar cobertura no `pytest.ini`**

Substituir o conteúdo de `backend/pytest.ini` por:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings_test
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
addopts = -vv --tb=short --strict-markers --cov=apps --cov-report=term-missing --cov-config=.coveragerc
markers =
    slow: marca testes lentos
    integration: marca testes de integração
```

- [ ] **Step 3: Criar `.coveragerc` excluindo migrations e arquivos de teste da métrica**

Criar `backend/.coveragerc`:

```ini
[run]
omit =
    */migrations/*
    */tests/*
    manage.py
    config/asgi.py
    config/wsgi.py

[report]
exclude_lines =
    pragma: no cover
    if TYPE_CHECKING:
```

- [ ] **Step 4: Instalar e rodar localmente para confirmar que funciona**

Run: `cd backend && pip install pytest-cov>=5.0.0 && pytest -q`
Expected: a saída do pytest passa a incluir uma tabela `Name / Stmts / Miss / Cover` ao final, sem quebrar nenhum teste existente.

- [ ] **Step 5: Nenhuma mudança necessária no CI**

O CI já roda `pytest -q` (`.github/workflows/ci.yml:66`), e como `addopts` no `pytest.ini` agora injeta `--cov` automaticamente, o relatório de cobertura já aparece nos logs do job `backend` sem alterar o workflow.

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/pytest.ini backend/.coveragerc
git commit -m "test(backend): mede cobertura de testes com pytest-cov"
```

---

### Task 7: Medir cobertura de testes do frontend

O script `"coverage": "vitest run --coverage"` existe em `frontend/package.json:12`, mas o provider de cobertura do Vitest não está instalado nem configurado em `vite.config.ts`.

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts:97-103`

**Interfaces:** N/A (configuração de ferramentas).

- [ ] **Step 1: Adicionar `@vitest/coverage-v8` como devDependency**

Em `frontend/package.json`, na seção `devDependencies`, adicionar (respeitando ordem alfabética já usada no arquivo, logo após `@vitejs/plugin-react`):

```json
    "@vitest/coverage-v8": "^3.2.6",
```

(mesma versão do `vitest`, já em `^3.2.6`, para compatibilidade garantida entre pacotes do mesmo monorepo do Vitest.)

- [ ] **Step 2: Configurar o provider de cobertura no `vite.config.ts`**

Em `frontend/vite.config.ts`, dentro do bloco `test: { ... }` (linhas 97-103), adicionar a chave `coverage`:

```ts
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/shared/lib/testSetup.ts'],
    css: true,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.tsx',
      ],
    },
  },
```

- [ ] **Step 3: Instalar e rodar localmente**

Run: `cd frontend && npm install && npm run coverage`
Expected: comando conclui gerando um relatório de texto no terminal e uma pasta `coverage/` com o relatório HTML, sem quebrar nenhum teste existente.

- [ ] **Step 4: Ignorar a pasta de cobertura no git**

Verificar se `coverage/` já está no `.gitignore` da raiz (`/opt/cavn-digital/.gitignore`); se não estiver, adicionar a linha `frontend/coverage/`.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/vite.config.ts .gitignore package-lock.json
git commit -m "test(frontend): mede cobertura de testes com @vitest/coverage-v8"
```

(Se `npm install` alterar `frontend/package-lock.json`, incluí-lo no commit também: `git add frontend/package-lock.json`.)

---

### Task 8: Corrigir testes E2E "placebo" (Playwright)

Dois testes fazem ações e aguardam (`waitForTimeout`) mas não têm nenhum `expect` relevante depois — sempre passam, independentemente do comportamento real: `admin-auth.spec.ts` (teste de credenciais inválidas) e `search.spec.ts` (teste de busca sem resultado).

**Files:**
- Modify: `frontend/e2e/admin-auth.spec.ts`
- Modify: `frontend/e2e/search.spec.ts`

**Interfaces:**
- Consumes: padrão de interceptação de API via `page.route()` já usado em `frontend/e2e/fluxo-completo.spec.ts` para `auth/login`.

- [ ] **Step 1: Corrigir o teste de credenciais inválidas em `admin-auth.spec.ts`**

Substituir o teste `'deve exibir erro com credenciais inválidas'` (linhas 12-26) por uma versão que intercepta o `POST /auth/login/` retornando 401 e afirma que uma mensagem de erro aparece na tela:

```ts
  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.route('**/api/v1/auth/login/', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Credenciais inválidas.' }),
      })
    );

    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill('admin@cavn.ufpb.br');
    await passwordInput.fill('senha_errada');
    await submitBtn.click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
```

- [ ] **Step 2: Corrigir o teste de busca sem resultado em `search.spec.ts`**

Substituir o teste `'deve exibir mensagem quando não há resultados'` (linhas 12-18) por uma versão que intercepta a busca com resposta vazia e afirma que o estado vazio aparece:

```ts
  test('deve exibir mensagem quando não há resultados', async ({ page }) => {
    await page.route('**/api/v1/documentos/**q=ZZZZNaoExiste9999**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
      })
    );

    await page.goto('/busca?q=ZZZZNaoExiste9999');

    await expect(page.getByRole('status')).toBeVisible();
  });
```

Nota: `page.getByRole('status')` depende do `EmptyState` (`frontend/src/shared/components/EmptyState.tsx:23`, `role="status"`) ser de fato renderizado pela `SearchPage` quando a lista de resultados vem vazia — confirmar visualmente rodando o teste antes de dar como concluído.

- [ ] **Step 3: Rodar os specs corrigidos**

Run: `cd frontend && npx playwright test e2e/admin-auth.spec.ts e2e/search.spec.ts`
Expected: todos os testes passam, e falhariam de verdade se a mensagem de erro/estado vazio deixasse de aparecer (testar isso manualmente comentando temporariamente o `role="alert"`/`role="status"` do componente correspondente e confirmando que o teste quebra, depois desfazer).

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/admin-auth.spec.ts frontend/e2e/search.spec.ts
git commit -m "test(e2e): corrige testes placebo sem asserts relevantes em admin-auth e search"
```

---

### Task 9: Adicionar teste de integração para upload de arquivo

O recurso mais sensível do sistema (SHA-256, MIME, tamanho) só tem teste de validador isolado (`core/tests/test_validators.py`) — nunca via endpoint real. Isso também serve de regressão adicional para as Tasks 1 e 2.

**Files:**
- Create: `backend/apps/documents/tests/test_upload_integration.py`

**Interfaces:**
- Consumes: `UserFactory` (`apps/users/tests/factories.py`), `Document`, `Arquivo` (`apps/documents/models.py`).

- [ ] **Step 1: Escrever os testes de integração de upload**

Criar `backend/apps/documents/tests/test_upload_integration.py`:

```python
import hashlib

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.core.constants import DocumentStatus, UserRole
from apps.documents.models import Arquivo, Document
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def catalogador(db):
    return UserFactory(role=UserRole.CATALOGUER)


@pytest.fixture
def documento_proprio(catalogador):
    return Document.objects.create(
        titulo="Documento com Upload",
        status=DocumentStatus.DRAFT,
        created_by=catalogador,
    )


@pytest.mark.django_db
class TestUploadIntegration:
    def test_upload_bem_sucedido_calcula_checksum_e_metadados(
        self, api_client, catalogador, documento_proprio
    ):
        conteudo = b"Conteudo real do arquivo de teste para checksum."
        arquivo_upload = SimpleUploadedFile(
            "documento.txt", conteudo, content_type="text/plain"
        )
        api_client.force_authenticate(user=catalogador)

        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(documento_proprio.pk),
                "arquivo": arquivo_upload,
                "tipo_arquivo": "original",
            },
            format="multipart",
        )

        assert response.status_code == 201
        arquivo = Arquivo.objects.get(documento=documento_proprio)
        assert arquivo.tamanho_bytes == len(conteudo)
        assert arquivo.checksum_sha256 == hashlib.sha256(conteudo).hexdigest()
        assert arquivo.mime_type

    def test_upload_extensao_nao_permitida_e_rejeitado(
        self, api_client, catalogador, documento_proprio
    ):
        arquivo_upload = SimpleUploadedFile(
            "script.exe", b"MZ conteudo executavel falso", content_type="application/octet-stream"
        )
        api_client.force_authenticate(user=catalogador)

        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(documento_proprio.pk),
                "arquivo": arquivo_upload,
                "tipo_arquivo": "original",
            },
            format="multipart",
        )

        assert response.status_code == 400
        assert not Arquivo.objects.filter(documento=documento_proprio).exists()

    def test_upload_sem_extensao_e_rejeitado(
        self, api_client, catalogador, documento_proprio
    ):
        arquivo_upload = SimpleUploadedFile(
            "semextensao", b"conteudo qualquer", content_type="application/octet-stream"
        )
        api_client.force_authenticate(user=catalogador)

        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(documento_proprio.pk),
                "arquivo": arquivo_upload,
                "tipo_arquivo": "original",
            },
            format="multipart",
        )

        assert response.status_code == 400
        assert not Arquivo.objects.filter(documento=documento_proprio).exists()

    def test_dois_arquivos_com_mesmo_conteudo_geram_mesmo_checksum(
        self, api_client, catalogador, documento_proprio
    ):
        conteudo = b"Conteudo identico para os dois arquivos."
        api_client.force_authenticate(user=catalogador)

        for nome in ("primeiro.txt", "segundo.txt"):
            response = api_client.post(
                "/api/v1/documentos/arquivos/",
                {
                    "documento": str(documento_proprio.pk),
                    "arquivo": SimpleUploadedFile(nome, conteudo, content_type="text/plain"),
                    "tipo_arquivo": "original",
                },
                format="multipart",
            )
            assert response.status_code == 201

        checksums = set(
            Arquivo.objects.filter(documento=documento_proprio).values_list(
                "checksum_sha256", flat=True
            )
        )
        assert checksums == {hashlib.sha256(conteudo).hexdigest()}
```

- [ ] **Step 2: Rodar os testes**

Run: `cd backend && pytest apps/documents/tests/test_upload_integration.py -v`
Expected: os 4 testes passam. Se `test_upload_bem_sucedido_calcula_checksum_e_metadados` falhar porque o checksum/mime/tamanho são calculados de forma assíncrona (via `processar_arquivo_async`, ver `apps/documents/tasks.py`) em vez de no momento do save, ajustar o teste para rodar a task de forma síncrona no teste: adicionar `CELERY_TASK_ALWAYS_EAGER = True` em `backend/config/settings_test.py` caso ainda não exista (checar antes de adicionar duplicado).

- [ ] **Step 3: Commit**

```bash
git add backend/apps/documents/tests/test_upload_integration.py backend/config/settings_test.py
git commit -m "test(documents): adiciona testes de integração para upload de arquivo real"
```

---

### Task 10: Adicionar fixtures/factories compartilhadas para reduzir duplicação

Fixtures de usuário (`curador`, `catalogador`) são duplicadas quase palavra por palavra em `academic/tests/test_api.py`, `gallery/tests/test_api.py`, `timeline/tests/test_api.py`, `tags/tests/test_api.py`. Não há factories para `Document`, `TimelineEvent`, `Album`, `ProducaoAcademica`, `Categoria`, `Tag`. Esta task adiciona os fixtures/factories compartilhados em `backend/conftest.py`; a Task 11 (novos testes de RBAC) já os utiliza. Não reescreve os testes existentes que já duplicam fixtures — isso fica fora do escopo desta fase.

**Files:**
- Modify: `backend/conftest.py`
- Create: `backend/apps/documents/tests/factories.py`
- Create: `backend/apps/timeline/tests/factories.py`
- Create: `backend/apps/gallery/tests/factories.py`
- Create: `backend/apps/academic/tests/factories.py`
- Create: `backend/apps/categories/tests/factories.py`
- Create: `backend/apps/tags/tests/factories.py`

**Interfaces:**
- Produces: fixtures `api_client`, `catalogador`, `curador`, `administrador`, `visitante` (todas `pytest.fixture`, retornando `APIClient`/`User`) disponíveis para qualquer teste do repositório sem import explícito (via `conftest.py` raiz). Produces: `DocumentFactory`, `TimelineEventFactory`, `AlbumFactory`, `ProducaoAcademicaFactory`, `CategoriaFactory`, `TagFactory` (cada uma um `factory.django.DjangoModelFactory` importável do respectivo `apps/<app>/tests/factories.py`).

- [ ] **Step 1: Adicionar fixtures de usuário compartilhadas ao `conftest.py` raiz**

Substituir o conteúdo de `backend/conftest.py` por:

```python
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def clear_cache():
    """Limpa o cache Django antes de cada teste para evitar interferência entre testes."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def visitante(db):
    return UserFactory(role=UserRole.VISITOR)


@pytest.fixture
def catalogador(db):
    return UserFactory(role=UserRole.CATALOGUER)


@pytest.fixture
def curador(db):
    return UserFactory(role=UserRole.CURATOR)


@pytest.fixture
def administrador(db):
    return UserFactory(role=UserRole.ADMINISTRATOR)
```

- [ ] **Step 2: Rodar a suíte completa para garantir que os fixtures locais dos apps não colidem com os novos globais**

Run: `cd backend && pytest -q`
Expected: PASS. Como fixtures locais em arquivos individuais (ex.: `academic/tests/test_api.py::curador`) têm precedência sobre as de `conftest.py` no escopo do próprio arquivo, não há quebra — apenas os apps que ainda não têm fixture local passam a herdar a global.

- [ ] **Step 3: Criar `DocumentFactory`**

Criar `backend/apps/documents/tests/factories.py`:

```python
import factory

from apps.core.constants import DocumentStatus
from apps.documents.models import Document


class DocumentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Document

    titulo = factory.Sequence(lambda n: f"Documento {n}")
    tipo_documento = "ata"
    status = DocumentStatus.DRAFT
```

- [ ] **Step 4: Criar `TimelineEventFactory`**

Criar `backend/apps/timeline/tests/factories.py`:

```python
import factory

from apps.timeline.models import TimelineEvent


class TimelineEventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TimelineEvent

    titulo = factory.Sequence(lambda n: f"Evento {n}")
    data_evento = factory.Faker("date_between", start_date="-80y", end_date="-1y")
```

- [ ] **Step 5: Criar `AlbumFactory`**

Criar `backend/apps/gallery/tests/factories.py`:

```python
import factory

from apps.gallery.models import Album


class AlbumFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Album

    titulo = factory.Sequence(lambda n: f"Álbum {n}")
    slug = factory.Sequence(lambda n: f"album-{n}")
```

- [ ] **Step 6: Criar `ProducaoAcademicaFactory`**

Criar `backend/apps/academic/tests/factories.py`:

```python
import factory

from apps.academic.models import ProducaoAcademica


class ProducaoAcademicaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProducaoAcademica

    titulo = factory.Sequence(lambda n: f"Produção {n}")
    autor = "Autor de Teste"
    ano = 2020
```

- [ ] **Step 7: Criar `CategoriaFactory` e `TagFactory`**

Criar `backend/apps/categories/tests/factories.py`:

```python
import factory

from apps.categories.models import Categoria


class CategoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Categoria

    nome = factory.Sequence(lambda n: f"Categoria {n}")
```

Criar `backend/apps/tags/tests/factories.py`:

```python
import factory

from apps.tags.models import Tag


class TagFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Tag

    nome = factory.Sequence(lambda n: f"tag-{n}")
```

- [ ] **Step 8: Rodar a suíte completa novamente**

Run: `cd backend && pytest -q`
Expected: PASS (as factories novas ainda não são usadas por nenhum teste existente; serão consumidas na Task 11).

- [ ] **Step 9: Commit**

```bash
git add backend/conftest.py backend/apps/documents/tests/factories.py backend/apps/timeline/tests/factories.py backend/apps/gallery/tests/factories.py backend/apps/academic/tests/factories.py backend/apps/categories/tests/factories.py backend/apps/tags/tests/factories.py
git commit -m "test: adiciona fixtures de usuário compartilhadas e factories para reduzir duplicação"
```

---

### Task 11: Adicionar testes de RBAC (caso negativo) para academic, gallery, timeline, categories, tags

Testes de autorização por papel são sólidos em `documents` e `users`, mas nesses 5 apps só existe "requer autenticação" (401) — nunca "papel de nível inferior tentando escrever" (403). `ProducaoAcademicaViewSet`, `AlbumViewSet`, `FotoViewSet`, `TimelineEventViewSet` usam `IsCuratorOrAdminOrReadOnly` (só curador/admin escrevem); `CategoriaViewSet`/`TagViewSet` usam `IsCataloguer` (catalogador+ escrevem).

**Files:**
- Modify: `backend/apps/academic/tests/test_api.py`
- Modify: `backend/apps/gallery/tests/test_api.py`
- Modify: `backend/apps/timeline/tests/test_api.py`
- Create: `backend/apps/categories/tests/test_api.py`
- Create: `backend/apps/tags/tests/test_api.py`

**Interfaces:**
- Consumes: fixtures `api_client`, `catalogador`, `curador`, `visitante` (Task 10), `ProducaoAcademicaFactory`, `AlbumFactory`, `TimelineEventFactory`, `CategoriaFactory`, `TagFactory` (Task 10).

- [ ] **Step 1: Testes de RBAC para `academic`**

Adicionar ao final de `backend/apps/academic/tests/test_api.py`:

```python
from apps.academic.tests.factories import ProducaoAcademicaFactory


@pytest.mark.django_db
class TestProducaoAcademicaRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post(
            "/api/v1/producao-academica/",
            {"titulo": "Tese Nova", "autor": "Fulano", "ano": 2023},
        )
        assert response.status_code == 403

    def test_cataloguer_cannot_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post(
            "/api/v1/producao-academica/",
            {"titulo": "Tese Nova", "autor": "Fulano", "ano": 2023},
        )
        assert response.status_code == 403

    def test_curator_can_create(self, api_client, curador):
        api_client.force_authenticate(user=curador)
        response = api_client.post(
            "/api/v1/producao-academica/",
            {"titulo": "Tese Nova", "autor": "Fulano", "ano": 2023},
        )
        assert response.status_code == 201

    def test_cataloguer_cannot_delete(self, api_client, catalogador):
        producao = ProducaoAcademicaFactory()
        api_client.force_authenticate(user=catalogador)
        response = api_client.delete(f"/api/v1/producao-academica/{producao.slug}/")
        assert response.status_code == 403
        assert ProducaoAcademica.objects.filter(pk=producao.pk).exists()
```

Adicionar o import que falta no topo do arquivo, se ainda não houver: `from apps.academic.models import ProducaoAcademica` (já deve existir — confirmar antes de duplicar).

- [ ] **Step 2: Testes de RBAC para `gallery` (Album e Foto)**

Adicionar ao final de `backend/apps/gallery/tests/test_api.py`:

```python
from apps.gallery.tests.factories import AlbumFactory


@pytest.mark.django_db
class TestAlbumRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post(
            "/api/v1/galeria/albuns/", {"titulo": "Álbum Novo", "slug": "album-novo"}
        )
        assert response.status_code == 403

    def test_cataloguer_cannot_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post(
            "/api/v1/galeria/albuns/", {"titulo": "Álbum Novo", "slug": "album-novo"}
        )
        assert response.status_code == 403

    def test_curator_can_create(self, api_client, curador):
        api_client.force_authenticate(user=curador)
        response = api_client.post(
            "/api/v1/galeria/albuns/", {"titulo": "Álbum Novo", "slug": "album-novo"}
        )
        assert response.status_code == 201

    def test_cataloguer_cannot_delete(self, api_client, catalogador):
        album = AlbumFactory()
        api_client.force_authenticate(user=catalogador)
        response = api_client.delete(f"/api/v1/galeria/albuns/{album.slug}/")
        assert response.status_code == 403
        assert Album.objects.filter(pk=album.pk).exists()
```

Adicionar `from apps.gallery.models import Album` no topo, se ainda não existir (confirmar antes de duplicar — o arquivo já importa `Album, Foto` de `apps.gallery.models` conforme visto na auditoria).

- [ ] **Step 3: Testes de RBAC para `timeline`**

Adicionar ao final de `backend/apps/timeline/tests/test_api.py`:

```python
from apps.timeline.tests.factories import TimelineEventFactory


@pytest.mark.django_db
class TestTimelineRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post(
            "/api/v1/timeline/eventos/", {"titulo": "Evento Novo", "data_evento": "1970-01-01"}
        )
        assert response.status_code == 403

    def test_cataloguer_cannot_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post(
            "/api/v1/timeline/eventos/", {"titulo": "Evento Novo", "data_evento": "1970-01-01"}
        )
        assert response.status_code == 403

    def test_curator_can_create(self, api_client, curador):
        api_client.force_authenticate(user=curador)
        response = api_client.post(
            "/api/v1/timeline/eventos/", {"titulo": "Evento Novo", "data_evento": "1970-01-01"}
        )
        assert response.status_code == 201

    def test_cataloguer_cannot_delete(self, api_client, catalogador):
        evento = TimelineEventFactory()
        api_client.force_authenticate(user=catalogador)
        response = api_client.delete(f"/api/v1/timeline/eventos/{evento.pk}/")
        assert response.status_code == 403
        assert TimelineEvent.objects.filter(pk=evento.pk).exists()
```

`visitante` e `catalogador` já existem como fixtures locais nesse arquivo ou vêm do `conftest.py` global (Task 10) — não duplicar se já houver definição local equivalente. `TimelineEvent` já é importado no topo do arquivo (confirmado na auditoria).

- [ ] **Step 4: Testes de RBAC para `categories`**

Os apps `categories` e `tags` só têm `test_models.py` hoje — não existe `test_api.py` (confirmado via `find backend/apps/categories/tests backend/apps/tags/tests -name "test_*.py"`). Criar `backend/apps/categories/tests/test_api.py`:

```python
import pytest
from rest_framework.test import APIClient

from apps.categories.models import Categoria
from apps.categories.tests.factories import CategoriaFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestCategoriaRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post("/api/v1/categorias/", {"nome": "Categoria Nova"})
        assert response.status_code == 403

    def test_cataloguer_can_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post("/api/v1/categorias/", {"nome": "Categoria Nova"})
        assert response.status_code == 201

    def test_visitor_cannot_delete(self, api_client, visitante):
        categoria = CategoriaFactory()
        api_client.force_authenticate(user=visitante)
        response = api_client.delete(f"/api/v1/categorias/{categoria.id}/")
        assert response.status_code == 403
        assert Categoria.objects.filter(pk=categoria.pk).exists()
```

`visitante` e `catalogador` vêm do `conftest.py` global (Task 10).

- [ ] **Step 5: Testes de RBAC para `tags`**

Criar `backend/apps/tags/tests/test_api.py`:

```python
import pytest
from rest_framework.test import APIClient

from apps.tags.models import Tag
from apps.tags.tests.factories import TagFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestTagRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post("/api/v1/tags/", {"nome": "tag-nova"})
        assert response.status_code == 403

    def test_cataloguer_can_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post("/api/v1/tags/", {"nome": "tag-nova"})
        assert response.status_code == 201

    def test_visitor_cannot_delete(self, api_client, visitante):
        tag = TagFactory()
        api_client.force_authenticate(user=visitante)
        response = api_client.delete(f"/api/v1/tags/{tag.id}/")
        assert response.status_code == 403
        assert Tag.objects.filter(pk=tag.pk).exists()
```

- [ ] **Step 6: Rodar a suíte completa**

Run: `cd backend && pytest -q`
Expected: todos os testes passam, incluindo os ~19 novos testes de RBAC.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/academic/tests/test_api.py backend/apps/gallery/tests/test_api.py backend/apps/timeline/tests/test_api.py backend/apps/categories/tests/test_api.py backend/apps/tags/tests/test_api.py
git commit -m "test(rbac): adiciona testes de autorização negativa para academic, gallery, timeline, categories e tags"
```

---

### Task 12: Estender a auditoria para login/logout, exclusão de arquivo e mudanças em usuário

`AuditoriaService` (`apps/audit/services.py`) só é chamado pelos signals de `Document` (`apps/documents/signals.py`). Login/logout, exclusão de `Arquivo` e mudanças em `User` nunca são auditados, apesar do enum `AuditAction` (`apps/core/constants.py:39-48`) já prever `LOGIN`, `LOGOUT`.

**Files:**
- Modify: `backend/apps/users/views.py` (`CustomTokenObtainPairView.post`, `logout_view`)
- Modify: `backend/apps/documents/views.py` (`ArquivoViewSet.perform_destroy`, já modificado na Task 1)
- Create: `backend/apps/users/signals.py`
- Modify: `backend/apps/users/apps.py`
- Test: `backend/apps/users/tests/test_audit.py`
- Test: `backend/apps/documents/tests/test_permissions.py`

**Interfaces:**
- Consumes: `AuditoriaService.registrar(usuario, acao, entidade, entidade_id, dados_anteriores=None, dados_novos=None, request=None)` (já existe, `apps/audit/services.py:9-37`).

- [ ] **Step 1: Escrever o teste de auditoria de login/logout (deve falhar)**

Criar `backend/apps/users/tests/test_audit.py`:

```python
import pytest
from rest_framework.test import APIClient

from apps.audit.models import Auditoria
from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestAuthAudit:
    def test_login_bem_sucedido_gera_registro_de_auditoria(self, api_client):
        user = UserFactory(role=UserRole.CURATOR)
        user.set_password("senha-forte-123")
        user.save()

        response = api_client.post(
            "/api/v1/auth/login/", {"email": user.email, "password": "senha-forte-123"}
        )

        assert response.status_code == 200
        assert Auditoria.objects.filter(usuario=user, acao="login").exists()

    def test_logout_gera_registro_de_auditoria(self, api_client):
        user = UserFactory(role=UserRole.CURATOR)
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/v1/auth/logout/")

        assert response.status_code == 200
        assert Auditoria.objects.filter(usuario=user, acao="logout").exists()
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest apps/users/tests/test_audit.py -v`
Expected: FAIL — nenhum registro de `Auditoria` é criado hoje.

- [ ] **Step 3: Registrar auditoria no login (`CustomTokenObtainPairView.post`)**

Em `backend/apps/users/views.py`, dentro de `CustomTokenObtainPairView.post`, logo após o bloco `if success:` que já existe (linha 108), antes do `_set_auth_cookies(...)`, adicionar a chamada de auditoria. O trecho final do método passa a ser:

```python
        if success:
            user = User.objects.filter(email=request.data.get("email")).first()
            # 2FA obrigatório para qualquer usuário privilegiado (catalogador, curador, admin)
            # que já tenha um dispositivo 2FA configurado.
            if user and user.can_catalogue():
                has_2fa = TOTPDevice.objects.filter(user=user, confirmed=True).exists()
                if has_2fa:
                    response.data["twofactor_required"] = True
                    response.data["user_id"] = str(user.pk)
                    # Não emite tokens JWT — o frontend precisa do token 2FA primeiro
                    return Response(
                        {
                            "twofactor_required": True,
                            "user_id": str(user.pk),
                            "email": user.email,
                        },
                        status=status.HTTP_200_OK,
                    )

            _set_auth_cookies(
                response,
                access_token=response.data.get("access"),
                refresh_token=response.data.get("refresh"),
            )
            _ensure_csrf_cookie(request)
            if user:
                response.data["usuario"] = UserSerializer(user).data
                AuditoriaService.registrar(
                    usuario=user, acao="login", entidade="User",
                    entidade_id=str(user.pk), request=request,
                )
        return response
```

Adicionar o import no topo do arquivo: `from apps.audit.services import AuditoriaService`.

- [ ] **Step 4: Registrar auditoria no logout**

Em `backend/apps/users/views.py`, modificar `logout_view` (linhas 170-186):

```python
@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    """Logout: adiciona o refresh token à blacklist e limpa os cookies."""
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh_token = request.COOKIES.get("cavn_refresh")
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

    if request.user and request.user.is_authenticated:
        AuditoriaService.registrar(
            usuario=request.user, acao="logout", entidade="User",
            entidade_id=str(request.user.pk), request=request,
        )

    response = Response({"sucesso": True, "mensagem": "Logout realizado com sucesso."})
    _clear_auth_cookies(response)
    return response
```

- [ ] **Step 5: Rodar o teste de login/logout e confirmar que passa**

Run: `cd backend && pytest apps/users/tests/test_audit.py -v`
Expected: PASS nos dois testes.

- [ ] **Step 6: Registrar auditoria na exclusão de `Arquivo` (teste primeiro)**

Adicionar ao final de `backend/apps/documents/tests/test_permissions.py`:

```python
    def test_delete_arquivo_gera_registro_de_auditoria(self, api_client):
        owner = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Doc com Arquivo Auditado", status=DocumentStatus.DRAFT, created_by=owner
        )
        arquivo = Arquivo.objects.create(
            documento=doc,
            arquivo=SimpleUploadedFile("a.txt", b"conteudo de teste"),
            tipo_arquivo="original",
        )
        api_client.force_authenticate(user=owner)

        response = api_client.delete(f"/api/v1/documentos/arquivos/{arquivo.pk}/")

        assert response.status_code == 204
        assert Auditoria.objects.filter(
            entidade="Arquivo", entidade_id=str(arquivo.pk), acao="excluir"
        ).exists()
```

Adicionar o import no topo do arquivo: `from apps.audit.models import Auditoria`.

- [ ] **Step 7: Rodar e confirmar que falha, depois implementar**

Run: `cd backend && pytest apps/documents/tests/test_permissions.py -k audit -v` — Expected FAIL.

Em `backend/apps/documents/views.py`, modificar `perform_destroy` (já alterado na Task 1) para registrar a auditoria:

```python
    def perform_destroy(self, instance):
        documento = instance.documento
        if not CanEditDocument().has_object_permission(self.request, self, documento):
            raise PermissionDenied("Você não tem permissão para remover este arquivo.")
        arquivo_id = str(instance.pk)
        instance.delete()
        AuditoriaService.registrar(
            usuario=self.request.user, acao="excluir", entidade="Arquivo",
            entidade_id=arquivo_id, request=self.request,
        )
```

Adicionar o import no topo de `views.py`: `from apps.audit.services import AuditoriaService`.

- [ ] **Step 8: Rodar novamente e confirmar que passa**

Run: `cd backend && pytest apps/documents/tests/test_permissions.py -v`
Expected: PASS em todos, incluindo o novo teste de auditoria.

- [ ] **Step 9: Registrar auditoria em criação/edição/exclusão de `User` via signals**

Criar `backend/apps/users/signals.py`:

```python
"""Signals para auditoria automática de usuários."""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.audit.services import AuditoriaService
from apps.users.models import User


@receiver(post_save, sender=User)
def log_user_save(sender, instance, created, **kwargs):
    """Registra criação ou atualização de usuários na auditoria."""
    AuditoriaService.registrar(
        usuario=instance,
        acao="criar" if created else "atualizar",
        entidade="User",
        entidade_id=str(instance.pk),
        dados_novos={"email": instance.email, "role": instance.role, "ativo": instance.is_active},
    )


@receiver(post_delete, sender=User)
def log_user_delete(sender, instance, **kwargs):
    """Registra exclusão de usuários na auditoria."""
    AuditoriaService.registrar(
        usuario=None,
        acao="excluir",
        entidade="User",
        entidade_id=str(instance.pk),
        dados_anteriores={"email": instance.email, "role": instance.role},
    )
```

Modificar `backend/apps/users/apps.py` para carregar os signals:

```python
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"

    def ready(self):
        import apps.users.signals  # noqa: F401
```

(Ajustar conforme o conteúdo real de `apps.py` lido antes de editar — preservar qualquer `verbose_name` já existente.)

- [ ] **Step 10: Escrever teste para os signals de `User` e rodar a suíte completa**

Adicionar a `backend/apps/users/tests/test_audit.py`:

```python
@pytest.mark.django_db
class TestUserModelAudit:
    def test_criar_usuario_gera_auditoria(self):
        user = UserFactory(role=UserRole.CATALOGUER)
        assert Auditoria.objects.filter(
            entidade="User", entidade_id=str(user.pk), acao="criar"
        ).exists()

    def test_excluir_usuario_gera_auditoria(self):
        user = UserFactory(role=UserRole.CATALOGUER)
        user_id = str(user.pk)
        user.delete()
        assert Auditoria.objects.filter(
            entidade="User", entidade_id=user_id, acao="excluir"
        ).exists()
```

Adicionar `from apps.audit.models import Auditoria` no topo de `test_audit.py`.

Run: `cd backend && pytest -q`
Expected: todos os testes passam. Atenção: como `log_user_save` roda em todo `post_save` de `User`, e `UserFactory` é usada extensivamente em outros testes, isso vai gerar registros de `Auditoria` adicionais nesses testes — confirmar que nenhum teste existente faz `Auditoria.objects.count()` ou asserção de contagem exata que quebraria com esse volume extra (buscar por `Auditoria.objects.count()` em todo `backend/apps` antes de finalizar).

- [ ] **Step 11: Commit**

```bash
git add backend/apps/users/views.py backend/apps/users/signals.py backend/apps/users/apps.py backend/apps/users/tests/test_audit.py backend/apps/documents/views.py backend/apps/documents/tests/test_permissions.py
git commit -m "feat(audit): estende auditoria para login, logout, exclusão de arquivo e mudanças em usuário"
```

---

### Task 13: Remover vazamento de PII do log de categorias

`apps/categories/views.py:44` grava o e-mail do usuário em texto puro no log a cada listagem de categorias — desnecessário e um vazamento leve de PII em log de aplicação.

**Files:**
- Modify: `backend/apps/categories/views.py:44`

**Interfaces:** N/A.

- [ ] **Step 1: Remover o campo `user`/e-mail do log estruturado**

Em `backend/apps/categories/views.py`, substituir a linha 44:

```python
        logger.info("listando_categorias", extra={"total": queryset.count(), "user": request.user.email if request.user.is_authenticated else "anonymous"})
```

por:

```python
        logger.info(
            "listando_categorias",
            extra={
                "total": queryset.count(),
                "autenticado": request.user.is_authenticated,
            },
        )
```

- [ ] **Step 2: Rodar os testes de categorias para confirmar que nada quebrou**

Run: `cd backend && pytest apps/categories -q`
Expected: PASS (mudança é só no log, sem efeito em asserts de resposta).

- [ ] **Step 3: Commit**

```bash
git add backend/apps/categories/views.py
git commit -m "fix(categories): remove e-mail do usuário do log de listagem de categorias"
```

---

### Task 14: Limpar o cache do React Query no logout

O cache do React Query (documentos admin, usuários, tags, auditoria) permanece em memória após o logout — se outro usuário logar na mesma aba sem reload, pode ver dados residuais da sessão anterior.

**Files:**
- Modify: `frontend/src/features/auth/stores/authStore.ts`

**Interfaces:**
- Consumes: `queryClient` (`frontend/src/shared/lib/queryClient.ts:3`, já exportado como default e named export).
- Produces: nenhuma interface nova — `logout()` já existente passa a ter efeito colateral adicional.

- [ ] **Step 1: Escrever o teste (deve falhar: cache não é limpo hoje)**

Criar `frontend/src/features/auth/stores/authStore.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { queryClient } from '@/shared/lib/queryClient';

describe('authStore', () => {
  it('limpa o cache do React Query ao fazer logout', () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');

    useAuthStore.getState().setAuth({
      id: '1',
      nome: 'Teste',
      email: 'teste@cavn.br',
      perfil: 'catalogador',
      ativo: true,
    } as never);
    useAuthStore.getState().logout();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();

    clearSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/features/auth/stores/authStore.test.ts`
Expected: FAIL — `clearSpy` nunca é chamado.

- [ ] **Step 3: Chamar `queryClient.clear()` no `logout()` da store**

Em `frontend/src/features/auth/stores/authStore.ts`, adicionar o import e ajustar `logout`:

```ts
import { create } from 'zustand';
import { Usuario, PerfilUsuario } from '@/shared/types';
import { queryClient } from '@/shared/lib/queryClient';

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
    queryClient.clear();
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

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd frontend && npx vitest run src/features/auth/stores/authStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte completa do frontend**

Run: `cd frontend && npm run test -- --run`
Expected: PASS — confirmar que nenhum outro teste dependia de dados de cache sobreviverem ao logout.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/stores/authStore.ts frontend/src/features/auth/stores/authStore.test.ts
git commit -m "fix(auth): limpa cache do React Query no logout para evitar dados residuais de sessão"
```

---

### Task 15: Corrigir o antipadrão em `useAuthSync`

`useAuthSync` (`frontend/src/features/auth/hooks/useAuth.ts:70-95`) faz um `useQuery` só para chamar `setAuth` como efeito colateral dentro do `queryFn` — o resultado do `useQuery` nunca é lido por ninguém. Isso mistura dado de servidor com um efeito manual de sincronização em vez de usar o próprio resultado do React Query.

**Files:**
- Modify: `frontend/src/features/auth/hooks/useAuth.ts:65-95`

**Interfaces:**
- Consumes: `useAuthStore` (`setAuth`, `logout`), `api.get<Usuario>('/auth/me/')`.
- Produces: comportamento externo de `useAuthSync()` inalterado (mesma sincronização de sessão na montagem do app) — só a implementação interna muda.

- [ ] **Step 1: Escrever o teste que verifica que o resultado do `useQuery` é de fato usado como fonte da sincronização**

Criar `frontend/src/features/auth/hooks/useAuth.test.tsx` (se um arquivo de teste equivalente já existir para `useAuth`, adicionar este `describe` a ele em vez de criar um novo arquivo):

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthSync } from './useAuth';
import { useAuthStore } from '../stores/authStore';
import api from '@/shared/lib/api';

vi.mock('@/shared/lib/api');

describe('useAuthSync', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    vi.clearAllMocks();
  });

  it('atualiza a store com os dados retornados por /auth/me/', async () => {
    const usuario = {
      id: '1',
      nome: 'Fulano',
      email: 'fulano@cavn.br',
      perfil: 'catalogador',
      ativo: true,
    };
    useAuthStore.setState({ user: usuario as never });
    vi.mocked(api.get).mockResolvedValue({ data: usuario });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useAuthSync(), { wrapper });

    await waitFor(() => {
      expect(useAuthStore.getState().user).toEqual(usuario);
    });
    expect(api.get).toHaveBeenCalledWith('/auth/me/');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que passa mesmo antes da correção (comportamento externo já funciona)**

Run: `cd frontend && npx vitest run src/features/auth/hooks/useAuth.test.tsx`
Expected: PASS — este teste valida o comportamento observável, que não muda; ele serve de rede de segurança para a Step 3.

- [ ] **Step 3: Reescrever `useAuthSync` usando o resultado do `useQuery` em um `useEffect`, em vez de `setAuth` dentro do `queryFn`**

Em `frontend/src/features/auth/hooks/useAuth.ts`, substituir a função `useAuthSync` (linhas 65-95) por:

```ts
/**
 * Valida a sessão com o servidor na montagem do app.
 * Se o cookie expirou ou foi revogado, limpa o estado local.
 * Deve ser montado uma única vez na raiz da aplicação.
 */
export function useAuthSync() {
  const { user, setAuth, logout } = useAuthStore((s) => ({
    user: s.user,
    setAuth: s.setAuth,
    logout: s.logout,
  }));

  const { data, isError } = useQuery({
    queryKey: ['auth-session-validate'],
    queryFn: async () => {
      const res = await api.get<Usuario>('/auth/me/');
      return res.data;
    },
    enabled: user !== null,
    retry: false,
    staleTime: 5 * 60 * 1000, // Revalida no máximo a cada 5 min
  });

  useEffect(() => {
    if (data) {
      setAuth(data);
    }
  }, [data, setAuth]);

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError, logout]);

  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);
}
```

- [ ] **Step 4: Rodar o teste novamente e confirmar que ainda passa**

Run: `cd frontend && npx vitest run src/features/auth/hooks/useAuth.test.tsx`
Expected: PASS — comportamento observável idêntico, agora implementado de forma correta (o dado do `useQuery` é a fonte, não um efeito colateral escondido no `queryFn`).

- [ ] **Step 5: Rodar a suíte completa do frontend**

Run: `cd frontend && npm run test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/hooks/useAuth.ts frontend/src/features/auth/hooks/useAuth.test.tsx
git commit -m "refactor(auth): corrige useAuthSync para usar o resultado do useQuery em vez de efeito colateral no queryFn"
```

---

### Task 16: Surfacear mensagens de erro reais do backend nos toasts

Praticamente todos os `onError` de `useMutation` disparam um toast genérico e hardcoded, escondendo a mensagem de validação real do backend (400 vs 500 ficam indistinguíveis para o usuário). Esta task cria um helper compartilhado e o aplica em `UsersPage.tsx` como referência — as demais páginas administrativas (`TagsPage.tsx`, `PasswordRequestsPage.tsx`, `CategoriesPage.tsx`, `TimelineAdminPage.tsx`) devem adotar o mesmo helper em uma iteração futura (fora do escopo desta task, para não expandir demais o raio de mudança de uma vez).

**Files:**
- Create: `frontend/src/shared/lib/getErrorMessage.ts`
- Create: `frontend/src/shared/lib/getErrorMessage.test.ts`
- Modify: `frontend/src/features/admin/pages/UsersPage.tsx`

**Interfaces:**
- Produces: `getErrorMessage(error: unknown, fallback: string): string` — extrai `error.response.data.detail` (ou a primeira mensagem de validação de campo) de um `AxiosError`, com fallback para uma mensagem genérica passada pelo chamador.

- [ ] **Step 1: Escrever o teste do helper**

Criar `frontend/src/shared/lib/getErrorMessage.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getErrorMessage } from './getErrorMessage';

describe('getErrorMessage', () => {
  it('retorna o detail da resposta quando presente', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: { detail: 'E-mail já cadastrado.' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };
    expect(getErrorMessage(error, 'Erro genérico.')).toBe('E-mail já cadastrado.');
  });

  it('retorna a primeira mensagem de erro de campo quando não há detail', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: { email: ['Este campo já existe.'] },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    };
    expect(getErrorMessage(error, 'Erro genérico.')).toBe('Este campo já existe.');
  });

  it('retorna o fallback quando o erro não é um AxiosError com resposta', () => {
    expect(getErrorMessage(new Error('rede fora do ar'), 'Erro genérico.')).toBe(
      'Erro genérico.'
    );
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha (módulo ainda não existe)**

Run: `cd frontend && npx vitest run src/shared/lib/getErrorMessage.test.ts`
Expected: FAIL com erro de módulo não encontrado.

- [ ] **Step 3: Implementar o helper**

Criar `frontend/src/shared/lib/getErrorMessage.ts`:

```ts
import { AxiosError } from 'axios';

interface DrfErrorBody {
  detail?: string;
  [field: string]: string | string[] | undefined;
}

/** Extrai uma mensagem de erro legível de um erro do Axios vindo da API DRF. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError) || !error.response) {
    return fallback;
  }

  const data = error.response.data as DrfErrorBody | undefined;
  if (!data) {
    return fallback;
  }

  if (typeof data.detail === 'string' && data.detail) {
    return data.detail;
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
    if (typeof value === 'string' && value) {
      return value;
    }
  }

  return fallback;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd frontend && npx vitest run src/shared/lib/getErrorMessage.test.ts`
Expected: PASS nos 3 testes.

- [ ] **Step 5: Aplicar o helper em `UsersPage.tsx`**

Em `frontend/src/features/admin/pages/UsersPage.tsx`, adicionar o import (`import { getErrorMessage } from '@/shared/lib/getErrorMessage';`) e substituir os três `onError` das mutations:

```ts
  const saveMutation = useMutation({
    mutationFn: (data: UserFormData) => {
      const payload: Partial<Usuario> & { senha?: string } = {
        nome: data.nome,
        email: data.email,
        perfil: data.perfil,
        ativo: data.ativo,
      };
      if (data.senha) payload.senha = data.senha;
      return editing
        ? adminApi.updateUser(editing.id, payload)
        : adminApi.createUser(payload as Partial<Usuario> & { senha: string });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast(editing ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.', 'success');
      closeModal();
    },
    onError: (error) => {
      toast(getErrorMessage(error, 'Não foi possível salvar o usuário. Tente novamente.'), 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      adminApi.toggleUserStatus(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast('Status do usuário atualizado com sucesso.', 'success');
    },
    onError: (error) => {
      toast(
        getErrorMessage(error, 'Não foi possível atualizar o status do usuário. Tente novamente.'),
        'error'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast('Usuário excluído com sucesso.', 'success');
    },
    onError: (error) => {
      toast(getErrorMessage(error, 'Não foi possível excluir o usuário. Tente novamente.'), 'error');
    },
  });
```

- [ ] **Step 6: Rodar os testes de `UsersPage` (se existirem) e a suíte completa**

Run: `cd frontend && npm run test -- --run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/lib/getErrorMessage.ts frontend/src/shared/lib/getErrorMessage.test.ts frontend/src/features/admin/pages/UsersPage.tsx
git commit -m "feat(admin): surfaceia mensagens de erro reais do backend nos toasts de UsersPage"
```

---

### Task 17: Adicionar `EmptyState` às listagens administrativas

`UsersPage.tsx`, `AuditPage.tsx` e outras páginas admin fazem `data?.map(...)` sem tratamento de lista vazia — ao contrário do padrão já usado nas páginas públicas (`SearchPage.tsx`). Esta task cobre as duas páginas com evidência concreta de código lido (`UsersPage.tsx`, `AuditPage.tsx`); as demais (`TagsPage.tsx`, `CategoriesPage.tsx`, `PasswordRequestsPage.tsx`, `TimelineAdminPage.tsx`) devem seguir o mesmo padrão em iteração futura.

**Files:**
- Modify: `frontend/src/features/admin/pages/UsersPage.tsx`
- Modify: `frontend/src/features/admin/pages/AuditPage.tsx`

**Interfaces:**
- Consumes: `EmptyState` (`frontend/src/shared/components/EmptyState.tsx`, props `title?`, `description?`, `icon?`, `action?`, `className?`).

- [ ] **Step 1: Adicionar `EmptyState` em `UsersPage.tsx`**

Em `frontend/src/features/admin/pages/UsersPage.tsx`, adicionar o import (`import { EmptyState } from '@/shared/components/EmptyState';`) e, no bloco de renderização da tabela, envolver o corpo da tabela com uma checagem de lista vazia. Localizar o trecho:

```tsx
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
```

E ajustar para:

```tsx
      <Card className="overflow-hidden p-0">
        {users && users.length === 0 ? (
          <EmptyState
            title="Nenhum usuário cadastrado"
            description="Crie o primeiro usuário para começar a gerenciar o acesso ao sistema."
          />
        ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface text-left">
```

E fechar o novo bloco condicional logo após o `</table>` existente, adicionando `)}` no lugar do fechamento simples do `<Card>`. Ajustar a indentação do bloco `<table>...</table>` já existente para dentro do `else` do ternário (sem alterar seu conteúdo interno).

- [ ] **Step 2: Adicionar `EmptyState` em `AuditPage.tsx`**

Substituir o conteúdo de `frontend/src/features/admin/pages/AuditPage.tsx`:

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import adminApi from '../api/adminApi';
import { Card } from '@/shared/components/Card';
import { Loading } from '@/shared/components/Loading';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import ptBR from '@/shared/i18n/pt-BR';
import { formatDateTimeBR } from '@/shared/lib/formatDate';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-audit', page],
    queryFn: () => adminApi.audit({ page, limit: 20 }),
  });

  if (isLoading) return <Loading fullScreen />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{ptBR.admin.audit}</h1>
      <Card className="overflow-hidden p-0">
        {data && data.dados.length === 0 ? (
          <EmptyState
            title="Nenhum registro de auditoria"
            description="As ações administrativas registradas aparecerão aqui."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface)] text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Usuário</th>
                  <th className="px-4 py-3 font-semibold">Ação</th>
                  <th className="px-4 py-3 font-semibold">Entidade</th>
                  <th className="px-4 py-3 font-semibold">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data?.dados.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3">{formatDateTimeBR(log.createdAt)}</td>
                    <td className="px-4 py-3">{log.usuario?.nome ?? 'Sistema'}</td>
                    <td className="px-4 py-3 font-medium">{log.acao}</td>
                    <td className="px-4 py-3">{log.entidade}</td>
                    <td className="px-4 py-3">{log.entidadeId ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && <Pagination page={page} totalPages={data.totalPaginas} onChange={setPage} />}
          </>
        )}
      </Card>
    </>
  );
}
```

- [ ] **Step 3: Verificar visualmente**

Rodar o frontend localmente (`npm run dev`), acessar `/admin/auditoria` e `/admin/usuarios` e confirmar visualmente que a listagem normal continua igual, e que — usando as devtools do navegador para simular uma resposta vazia, ou temporariamente filtrando por um termo sem resultado, se a página suportar — o `EmptyState` aparece corretamente em vez de uma tabela vazia sem cabeçalho de dados.

- [ ] **Step 4: Rodar a suíte completa do frontend**

Run: `cd frontend && npm run test -- --run && npm run build`
Expected: PASS, build sem erros de tipo (o ternário não pode deixar `users`/`data` undefined sem tratamento no branch de tabela).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/admin/pages/UsersPage.tsx frontend/src/features/admin/pages/AuditPage.tsx
git commit -m "feat(admin): adiciona EmptyState às listagens de usuários e auditoria"
```

---

### Task 18: Adicionar correlation ID às requisições e aos logs

Não há nenhum ID de correlação entre uma requisição HTTP e os logs gerados por ela (nem entre a requisição e a task Celery que ela dispara) — impossível rastrear uma requisição através de múltiplos containers.

**Files:**
- Modify: `backend/apps/core/middleware.py`
- Modify: `backend/config/settings.py:381-398` (`_JsonFormatter`)
- Test: `backend/apps/core/tests/test_middleware.py`

**Interfaces:**
- Produces: `apps.core.middleware.request_id_var` — um `contextvars.ContextVar[str]` legível por qualquer código (inclusive logging) durante o ciclo de vida de uma requisição; header de resposta `X-Request-ID`.

- [ ] **Step 1: Escrever o teste do middleware (deve falhar: middleware ainda não existe)**

Criar `backend/apps/core/tests/test_middleware.py`:

```python
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestRequestIdMiddleware:
    def test_resposta_inclui_header_x_request_id(self, api_client):
        response = api_client.get("/api/v1/health/")
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0

    def test_request_id_enviado_pelo_cliente_e_reaproveitado(self, api_client):
        response = api_client.get(
            "/api/v1/health/", HTTP_X_REQUEST_ID="id-fixo-do-cliente-123"
        )
        assert response.headers["X-Request-ID"] == "id-fixo-do-cliente-123"
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest apps/core/tests/test_middleware.py -v`
Expected: FAIL — hoje não há header `X-Request-ID` na resposta.

- [ ] **Step 3: Implementar o middleware de correlation ID**

Em `backend/apps/core/middleware.py`, adicionar ao final do arquivo (mantendo `NoCacheAPIMiddleware` existente intacto):

```python
import contextvars
import uuid

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)


class RequestIdMiddleware:
    """Gera (ou reaproveita) um ID de correlação por requisição.

    Disponível em request_id_var para ser incluído nos logs (inclusive os
    emitidos por tasks Celery disparadas dentro da mesma requisição via
    .delay(), desde que o ID seja propagado explicitamente nos kwargs da task).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_id = request.META.get("HTTP_X_REQUEST_ID", "")
        request_id = incoming_id or str(uuid.uuid4())
        token = request_id_var.set(request_id)
        request.request_id = request_id
        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)
        response["X-Request-ID"] = request_id
        return response
```

- [ ] **Step 4: Registrar o middleware em `settings.py`**

Em `backend/config/settings.py`, adicionar `"apps.core.middleware.RequestIdMiddleware"` como o **primeiro** item da lista `MIDDLEWARE` (linha 105), antes até do `CorsMiddleware`, para que o ID exista durante todo o ciclo de vida da requisição:

```python
MIDDLEWARE = [
    "apps.core.middleware.RequestIdMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "apps.core.middleware.NoCacheAPIMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Deve vir depois de AuthenticationMiddleware (requisito do django-axes)
    # e por último na lista para observar a resposta final de todos os demais.
    "axes.middleware.AxesMiddleware",
]
```

- [ ] **Step 5: Incluir o `request_id` no formatter JSON de log**

Em `backend/config/settings.py`, modificar `_JsonFormatter.format` (linhas 384-398):

```python
class _JsonFormatter(logging.Formatter):
    """Formata cada linha de log como JSON para ingestão por ferramentas de observabilidade."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        from apps.core.middleware import request_id_var

        payload: dict = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "lineno": record.lineno,
            "request_id": request_id_var.get(),
        }
        if record.exc_info:
            payload["exc"] = traceback.format_exception(*record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `cd backend && pytest apps/core/tests/test_middleware.py -v`
Expected: PASS nos 2 testes.

- [ ] **Step 7: Rodar a suíte completa**

Run: `cd backend && pytest -q`
Expected: PASS (o novo middleware não altera nenhuma resposta existente além do header adicional).

- [ ] **Step 8: Commit**

```bash
git add backend/apps/core/middleware.py backend/config/settings.py backend/apps/core/tests/test_middleware.py
git commit -m "feat(observability): adiciona ID de correlação por requisição via header X-Request-ID e nos logs JSON"
```

---

### Task 19: Health check real (Postgres e Redis)

`/api/v1/health/` só confirma que o processo Django responde — não verifica Postgres nem Redis, então o `docker compose healthcheck` do backend não detecta um Postgres fora do ar.

**Files:**
- Modify: `backend/apps/core/views.py:47-54`
- Test: `backend/apps/core/tests/test_health.py`

**Interfaces:**
- Produces: `GET /api/v1/health/` passa a retornar 200 com `{"status": "ok", "checks": {"database": "ok", "cache": "ok"}}` quando tudo está saudável, e 503 com o(s) componente(s) com falha detalhados quando não está.

- [ ] **Step 1: Escrever os testes (devem falhar: hoje sempre retorna 200 sem checar nada)**

Criar `backend/apps/core/tests/test_health.py`:

```python
from unittest.mock import patch

import pytest
from django.db import DatabaseError
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestHealthCheck:
    def test_saudavel_retorna_200_com_checks_detalhados(self, api_client):
        response = api_client.get("/api/v1/health/")
        assert response.status_code == 200
        assert response.data["status"] == "ok"
        assert response.data["checks"]["database"] == "ok"
        assert response.data["checks"]["cache"] == "ok"

    def test_banco_fora_do_ar_retorna_503(self, api_client):
        with patch(
            "apps.core.views.connections",
        ) as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = DatabaseError(
                "conexão recusada"
            )
            response = api_client.get("/api/v1/health/")
        assert response.status_code == 503
        assert response.data["checks"]["database"] == "erro"

    def test_cache_fora_do_ar_retorna_503(self, api_client):
        with patch("apps.core.views.cache") as mock_cache:
            mock_cache.set.side_effect = ConnectionError("redis indisponível")
            response = api_client.get("/api/v1/health/")
        assert response.status_code == 503
        assert response.data["checks"]["cache"] == "erro"
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest apps/core/tests/test_health.py -v`
Expected: FAIL — a resposta atual não tem a chave `checks`.

- [ ] **Step 3: Implementar o health check real**

Em `backend/apps/core/views.py`, adicionar o import `from django.db import connections` no topo (junto aos demais imports de `django.db`, já há `from django.db.models import Count` — adicionar `connections` numa linha separada: `from django.db import connections`), e substituir `HealthCheckView` (linhas 47-54):

```python
class HealthCheckView(APIView):
    """Endpoint de verificação de saúde: confere Postgres e Redis, não só o processo."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        checks = {}

        try:
            connections["default"].cursor()
            checks["database"] = "ok"
        except Exception:
            checks["database"] = "erro"

        try:
            cache.set("health_check_probe", "1", timeout=5)
            checks["cache"] = "ok"
        except Exception:
            checks["cache"] = "erro"

        saudavel = all(v == "ok" for v in checks.values())
        return Response(
            {"status": "ok" if saudavel else "erro", "service": "cavn-digital-backend", "checks": checks},
            status=status.HTTP_200_OK if saudavel else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
```

Confirmar que `cache` (de `django.core.cache`) já está importado no topo do arquivo (linha 7, confirmado na leitura) — nenhum import novo necessário para isso.

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd backend && pytest apps/core/tests/test_health.py -v`
Expected: PASS nos 3 testes.

- [ ] **Step 5: Rodar a suíte completa**

Run: `cd backend && pytest -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/core/views.py backend/apps/core/tests/test_health.py
git commit -m "feat(health): health check passa a verificar Postgres e Redis, não só o processo"
```

---

### Task 20: Adicionar script de restore de backup

`scripts/backup.sh` cobre banco e mídia, cifrados com GPG, mas não existe nenhum script de restore — só um comentário de exemplo dentro do próprio `backup.sh`. Backup nunca testado é disaster recovery teórico.

**Files:**
- Create: `scripts/restore.sh`

**Interfaces:** N/A (script operacional).

- [ ] **Step 1: Criar o script de restore**

Criar `scripts/restore.sh`:

```bash
#!/usr/bin/env bash
# =============================================================================
# Restore de banco de dados e/ou mídia do Repositório Digital CAVN
# =============================================================================
# Uso:
#   bash scripts/restore.sh db /opt/cavn-digital-backups/db_20260101_020000.sql.gz.gpg
#   bash scripts/restore.sh media /opt/cavn-digital-backups/media_20260101_020000.tar.gz.gpg
#
# ATENÇÃO: restore do banco SUBSTITUI todos os dados atuais. Confirme o
# ambiente (produção vs. staging) antes de prosseguir — o script pede
# confirmação explícita.
# =============================================================================
set -euo pipefail

PROJECT_DIR="/opt/cavn-digital"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ $# -ne 2 ]]; then
  echo "Uso: bash scripts/restore.sh {db|media} <caminho_do_arquivo.gpg>" >&2
  exit 1
fi

TIPO="$1"
ARQUIVO_CIFRADO="$2"

if [[ ! -f "${ARQUIVO_CIFRADO}" ]]; then
  echo "ERRO: arquivo não encontrado: ${ARQUIVO_CIFRADO}" >&2
  exit 1
fi

if [[ -f "${PROJECT_DIR}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${PROJECT_DIR}/.env"
  set +a
fi

if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
  echo "ERRO: BACKUP_PASSPHRASE não configurada no .env — não é possível decifrar." >&2
  exit 1
fi

DB_USER="${DB_USER:-cavn_digital}"
DB_NAME="${DB_NAME:-cavn_digital}"

echo "!!! Você está prestes a restaurar '${TIPO}' a partir de ${ARQUIVO_CIFRADO} !!!"
echo "Isso pode SOBRESCREVER dados atuais em ${PROJECT_DIR}."
read -r -p "Digite 'restaurar' para confirmar: " CONFIRMACAO
if [[ "${CONFIRMACAO}" != "restaurar" ]]; then
  echo "Cancelado."
  exit 1
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

decrypt() {
  local encrypted_file="$1"
  local output_file="$2"
  gpg --batch --yes --pinentry-mode loopback \
      --passphrase-file <(printf '%s' "${BACKUP_PASSPHRASE}") \
      --decrypt --output "${output_file}" "${encrypted_file}"
}

case "${TIPO}" in
  db)
    DECRYPTED="${TMP_DIR}/db_restore.sql.gz"
    decrypt "${ARQUIVO_CIFRADO}" "${DECRYPTED}"
    gunzip -f "${DECRYPTED}"
    SQL_FILE="${DECRYPTED%.gz}"
    echo "==> Restaurando banco de dados a partir de ${SQL_FILE}..."
    cd "${PROJECT_DIR}"
    docker compose -f "${COMPOSE_FILE}" exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" < "${SQL_FILE}"
    echo "==> Banco restaurado com sucesso."
    ;;
  media)
    DECRYPTED="${TMP_DIR}/media_restore.tar.gz"
    decrypt "${ARQUIVO_CIFRADO}" "${DECRYPTED}"
    echo "==> Restaurando pasta media a partir de ${DECRYPTED}..."
    tar -xzf "${DECRYPTED}" -C "${PROJECT_DIR}/backend"
    echo "==> Mídia restaurada com sucesso."
    ;;
  *)
    echo "ERRO: tipo inválido '${TIPO}'. Use 'db' ou 'media'." >&2
    exit 1
    ;;
esac
```

- [ ] **Step 2: Tornar o script executável**

Run: `chmod +x scripts/restore.sh`

- [ ] **Step 3: Testar o ciclo completo backup → restore em um ambiente de staging/local (não produção)**

Rodar `bash scripts/backup.sh` em um ambiente de teste, depois `bash scripts/restore.sh db <arquivo_gerado>` e `bash scripts/restore.sh media <arquivo_gerado>`, confirmando manualmente que os dados voltam ao estado esperado. **Não considerar esta task concluída sem esse teste manual real** — é exatamente o ponto que estava faltando (backup nunca testado).

- [ ] **Step 4: Documentar o restore no README**

Adicionar uma subseção "Restore de backup" logo após a seção de backup existente no `README.md`, referenciando `scripts/restore.sh` e o aviso de que ele sobrescreve dados atuais.

- [ ] **Step 5: Commit**

```bash
git add scripts/restore.sh README.md
git commit -m "feat(backup): adiciona script de restore e documenta o processo no README"
```

---

### Task 21: Corrigir inconsistências do README

O README afirma "Django 4.2" (linha 13) mas `requirements.txt` já está em `Django>=5.2,<5.3` (migrado, conforme commit `662180a`). O número de testes também diverge internamente: "89 testes passando" (linha 5) vs. "91 testes" no checklist (linha 445) — nenhum dos dois bate com a contagem real atual.

**Files:**
- Modify: `README.md`

**Interfaces:** N/A.

- [ ] **Step 1: Obter a contagem real e atual de testes do backend**

Run: `cd backend && pytest --collect-only -q | tail -3`
Anotar o número exato reportado (ex.: `96 tests collected`).

- [ ] **Step 2: Corrigir a versão do Django na tabela de tecnologias**

Em `README.md`, linha 13, substituir:

```
| Backend | Django 4.2 + Django REST Framework + SimpleJWT |
```

por:

```
| Backend | Django 5.2 LTS + Django REST Framework + SimpleJWT |
```

- [ ] **Step 3: Corrigir as duas menções ao número de testes usando a contagem real da Step 1**

Em `README.md`, linha 5, substituir `89 testes de backend passando` pelo número real obtido; linha 300, substituir `**89 testes passando** em 20 arquivos` pelo número real de testes e de arquivos (`find backend/apps -name "test_*.py" -o -name "tests.py" | grep -v __pycache__ | wc -l` para a contagem de arquivos); linha 445, substituir `Testes backend passando (91 testes)` pelo mesmo número real.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: corrige versão do Django e contagem de testes no README"
```

---

### Task 22: Configurar mypy de fato (ou removê-lo se não for usado)

`mypy` e `django-stubs` estão em `requirements.txt` mas não há `[tool.mypy]` nem `mypy.ini`, e não rodam no CI — instalado mas decorativo.

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `.github/workflows/ci.yml`

**Interfaces:** N/A.

- [ ] **Step 1: Adicionar configuração mínima de mypy ao `pyproject.toml`**

Em `backend/pyproject.toml`, adicionar ao final:

```toml
[tool.mypy]
python_version = "3.13"
plugins = ["mypy_django_plugin.main"]
ignore_missing_imports = true
exclude = ["migrations/", ".venv", ".venv-linux"]
check_untyped_defs = false

[tool.django-stubs]
django_settings_module = "config.settings"
```

Config deliberadamente permissiva (`check_untyped_defs = false`, sem `disallow_untyped_defs`) — o código atual não tem type hints consistentes; o objetivo desta task é ligar a ferramenta sem quebrar o CI com centenas de erros de uma vez. Apertar as regras é trabalho futuro incremental.

- [ ] **Step 2: Rodar localmente e ver quantos erros aparecem antes de decidir o modo de falha no CI**

Run: `cd backend && mypy apps config`
Observar a contagem de erros. Se for um número grande (dezenas+), o CI deve rodar mypy em modo "não bloqueante" nesta primeira etapa (Step 3 abaixo usa `continue-on-error: true` exatamente por isso).

- [ ] **Step 3: Adicionar o step ao CI em modo não bloqueante**

Em `.github/workflows/ci.yml`, no job `backend`, adicionar um novo step logo após "Lint com Ruff" (linha 50):

```yaml
      - name: Type checking com mypy (não bloqueante nesta fase)
        continue-on-error: true
        run: mypy apps config
```

- [ ] **Step 4: Commit**

```bash
git add backend/pyproject.toml .github/workflows/ci.yml
git commit -m "ci(backend): ativa mypy no CI em modo não bloqueante"
```

---

### Task 23: Adicionar pre-commit hooks

Não existe `.pre-commit-config.yaml` — qualidade depende 100% do CI, sem gate local antes do commit.

**Files:**
- Create: `.pre-commit-config.yaml`
- Modify: `backend/requirements.txt`

**Interfaces:** N/A.

- [ ] **Step 1: Adicionar `pre-commit` às dependências de desenvolvimento do backend**

Em `backend/requirements.txt`, na seção `# Qualidade de código (opcional em desenvolvimento)`, adicionar após `django-stubs>=4.2.7`:

```
pre-commit>=3.6.0
```

- [ ] **Step 2: Criar `.pre-commit-config.yaml` na raiz do projeto**

Criar `/opt/cavn-digital/.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix]
        files: ^backend/
      - id: ruff-format
        files: ^backend/

  - repo: local
    hooks:
      - id: eslint
        name: eslint (frontend)
        entry: bash -c 'cd frontend && npm run lint'
        language: system
        files: ^frontend/.*\.(ts|tsx)$
        pass_filenames: false

      - id: prettier
        name: prettier (frontend)
        entry: bash -c 'cd frontend && npx prettier --check "src/**/*.{ts,tsx,css,json}"'
        language: system
        files: ^frontend/.*\.(ts|tsx|css|json)$
        pass_filenames: false

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-merge-conflict
      - id: check-added-large-files
        args: [--maxkb=5000]
```

- [ ] **Step 3: Instalar e testar localmente**

Run: `pip install pre-commit>=3.6.0 && pre-commit install && pre-commit run --all-files`
Expected: cada hook roda contra os arquivos existentes; corrigir manualmente qualquer achado real de lint que apareça nesta primeira execução (não commitar formatações em massa não relacionadas nesta task — se `ruff --fix`/`prettier` alterar muitos arquivos de uma vez, avaliar com o time antes de commitar tudo junto).

- [ ] **Step 4: Documentar no README como ativar**

Adicionar uma linha na seção de instalação/desenvolvimento do `README.md`: `pip install pre-commit && pre-commit install` (rodar uma vez após clonar o repositório).

- [ ] **Step 5: Commit**

```bash
git add .pre-commit-config.yaml backend/requirements.txt README.md
git commit -m "chore: adiciona pre-commit hooks para ruff, eslint e prettier"
```

---

## Ordem de execução recomendada

1. **Tasks 1-5 (P0 segurança)** — sempre primeiro, correções de maior risco.
2. **Tasks 6-11 (P1 testes)** — depois de segurança, para que as correções fiquem protegidas por regressão.
3. **Tasks 12-13 (P2 auditoria/PII)** — independentes, podem intercalar com P1.
4. **Tasks 14-17 (P3 frontend)** — independentes entre si e das tasks de backend.
5. **Tasks 18-23 (P4 ops/docs)** — independentes entre si; Task 21 (README) deve rodar por último, pois depende da contagem final de testes após as Tasks 9 e 11 adicionarem novos arquivos.
