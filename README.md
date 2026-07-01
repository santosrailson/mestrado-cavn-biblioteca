# Repositório Digital CAVN

Sistema web completo para preservação, organização e disseminação do acervo histórico do **Colégio Agrícola Vidal de Negreiros (CAVN/UFPB)**.

> **Status:** Aplicação madura, pronta para produção — backend Django, frontend React (SPA + PWA), admin moderno com Django Unfold, autenticação JWT em cookie httpOnly com 2FA (TOTP), 89 testes de backend passando, suíte E2E com Playwright e stack de deploy completa (Docker Compose de produção, Nginx + SSL, Celery, backups e Sentry).

---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Backend | Django 4.2 + Django REST Framework + SimpleJWT |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| UI Admin | Django Unfold (moderna, responsiva e acessível) |
| Banco de dados | PostgreSQL 16 (SQLite disponível para dev local) |
| Cache / Fila | Redis 7 + Celery (worker, beat e Flower) |
| Autenticação | JWT em cookie httpOnly + 2FA TOTP (django-otp / pyotp) |
| Segurança | django-axes (lockout), django-csp, django-ratelimit, Sentry |
| PWA | Service worker via Workbox (vite-plugin-pwa) + Web Vitals |
| Testes | pytest (backend), Vitest + Testing Library e Playwright (frontend) |
| Documentação API | drf-spectacular (OpenAPI 3 / Swagger) |
| Containerização | Docker + Docker Compose |

---

## Funcionalidades implementadas

### Site público

- Home com hero banner, categorias em destaque, últimos documentos e timeline resumida
- Busca full-text com filtros (tipo, categoria, período, tags)
- Página de documento com visualizador, ficha catalográfica e metadados Dublin Core
- Navegação por categorias hierárquicas
- Linha do tempo interativa
- Galeria de imagens com álbuns e lightbox
- Seção de produção acadêmica
- Acessibilidade: alto contraste, ajuste de fonte, skip links, foco visível, navegação por teclado

### Área administrativa (React + Django Admin)

- Autenticação JWT em **cookie httpOnly** com refresh automático e perfis de usuário
- **Autenticação de dois fatores (2FA)** via TOTP: setup com QR code, verificação, desativação e login em duas etapas
- **Fluxo de solicitação e aprovação de troca de senha** (usuário solicita, curador/admin aprova ou rejeita)
- Dashboard com métricas e atividades recentes
- CRUD de documentos com workflow de aprovação:
  `rascunho → em_revisao → aprovado → publicado → arquivado`
- CRUD de categorias, tags, timeline, galeria, usuários e configurações
- Logs de auditoria automáticos (quem criou/alterou/excluiu e quando)
- Upload de arquivos com checksum SHA-256, validação de extensão/MIME e geração de thumbnails
- Django Admin aprimorado com Django Unfold para gestão direta dos modelos

---

## Requisitos

- Python 3.9+
- Node.js 20+
- PostgreSQL 15+ **ou** SQLite para desenvolvimento local
- Redis 7+ (opcional em dev)
- Docker + Docker Compose (opcional, recomendado)

---

## Deploy em produção

Passo a passo usado para deploy na VPS com Nginx + Let's Encrypt:

```bash
# 1. Enviar projeto para a VPS
rsync -avz --exclude='node_modules' --exclude='.venv' --exclude='__pycache__' \
  --exclude='.git' --exclude='.pytest_cache' --exclude='dist' --exclude='*.pyc' \
  --exclude='db.sqlite3' --exclude='media' --exclude='staticfiles' --exclude='logs' \
  -e 'ssh -p 77' ./ root@76.13.224.157:/opt/cavn-digital/

# 2. Na VPS, criar .env de produção
ssh -p 77 root@76.13.224.157
cd /opt/cavn-digital
cp env-example-prod.txt .env
# Edite .env com SECRET_KEY forte, DEBUG=False, domínio correto etc.

# 3. Subir containers de produção (backend, db, redis, celery)
cd /opt/cavn-digital
docker compose -f docker-compose.prod.yml up -d --build

# Verifique os workers do Celery
# docker compose -f docker-compose.prod.yml logs -f celery-worker

# 4. Criar superusuário (apenas na primeira instalação)
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# 5. Configurar Nginx e SSL
certbot --nginx -d bibliotecadigital.cchsa-cavn.tec.br --non-interactive \
  --agree-tos -m noreply@cavn.ufpb.br --redirect
```

A configuração completa do Nginx fica em `/etc/nginx/sites-enabled/bibliotecadigital.cchsa-cavn.tec.br`. Use como base o arquivo `nginx/host-nginx.conf` deste repositório — ele já está otimizado para servir `/static/` e `/media/` diretamente do disco e inclui headers de segurança e rate limiting.

### Backup

O script `scripts/backup.sh` faz backup diário do banco, da pasta `media/` e do `.env`:

```bash
bash scripts/backup.sh
```

Recomenda-se agendamento via cron:

```bash
0 2 * * * cd /opt/cavn-digital && bash scripts/backup.sh >> /var/log/cavn-backup.log 2>&1
```

> **Importante:** sincronize os arquivos de `/opt/cavn-digital-backups` para um storage externo (S3, Backblaze B2, etc.) para garantir recuperação em desastres.

### Segurança adicional

- **Autenticação de dois fatores (2FA):** TOTP compatível com Google Authenticator/Authy via `django-otp` + `pyotp`, com QR code gerado pelo backend.
- **Tokens em cookie httpOnly:** os JWT trafegam em cookies `HttpOnly`/`Secure` (não ficam expostos ao JavaScript), reduzindo a superfície de XSS.
- **Account lockout:** tentativas de login são monitoradas pelo `django-axes`. Após `AXES_FAILURE_LIMIT` tentativas falhas (padrão: 5), o IP/usuário é bloqueado por `AXES_COOLOFF_TIME_MINUTES` minutos (padrão: 15).
- **Rate limiting:** throttling do DRF por usuário/anônimo e `django-ratelimit` em endpoints sensíveis.
- **Content Security Policy (CSP):** headers de CSP são enviados pelo Django quando `django-csp` está instalado.
- **Monitoramento de erros:** configure `SENTRY_DSN` no `.env` para enviar erros e traces para o Sentry.

---

## Instalação rápida com Docker Compose (desenvolvimento)

```bash
cd cavn-digital
cp .env.example .env
# Para popular com dados de exemplo na primeira execução:
RUN_SEED_DATA=true docker-compose up --build
```

A primeira execução executa automaticamente:

1. Migrações do banco de dados
2. Coleta de arquivos estáticos
3. Carga de dados de exemplo (`seed_data`) — apenas se `RUN_SEED_DATA=true`

> **Nota sobre portas:** se você já tiver PostgreSQL ou Redis rodando localmente nas portas padrão, o `docker-compose.yml` mapeia os serviços para portas alternativas no host: **PostgreSQL `5433`** e **Redis `6380`**. Os containers se comunicam internamente pelas portas padrão (`5432` e `6379`).

### Acessos

| Serviço | URL |
|---------|-----|
| Site público | http://localhost |
| Área administrativa React | http://localhost/admin |
| API REST | http://localhost:8000/api/v1/ |
| Admin Django (Unfold) | http://localhost:8000/django-admin/ |
| Swagger / OpenAPI | http://localhost:8000/api/v1/swagger/ |
| Redoc | http://localhost:8000/api/v1/redoc/ |
| Healthcheck | http://localhost:8000/api/v1/health/ |

### Usuários de exemplo

Ao rodar `seed_data`, usuários de exemplo são criados com **senhas fortes geradas aleatoriamente** e exibidas no log do container.

| E-mail | Perfil |
|--------|--------|
| `admin@cavn.ufpb.br` | Administrador |
| `curador@cavn.ufpb.br` | Curador |
| `catalogador@cavn.ufpb.br` | Catalogador |

> **Segurança:** as senhas antigas fixas (`Admin@123` etc.) foram removidas. Você pode predefinir senhas via variáveis `SEED_ADMIN_PASSWORD`, `SEED_CURADOR_PASSWORD` e `SEED_CATALOGADOR_PASSWORD`.

---

## Instalação manual (sem Docker)

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edite .env conforme necessário. Para usar SQLite, defina DB_ENGINE=sqlite
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_data --reset
python manage.py runserver
```

O backend estará disponível em http://localhost:8000.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

O frontend estará disponível em http://localhost:5173.

> Em modo de desenvolvimento, o CORS já está configurado para permitir comunicação entre `localhost:5173` e `localhost:8000`.

---

## Estrutura do projeto

```
cavn-digital/
├── backend/
│   ├── apps/
│   │   ├── users/          # Usuários customizados, JWT, permissões
│   │   ├── documents/      # Documentos, arquivos, autores, metadados
│   │   ├── categories/     # Categorias hierárquicas
│   │   ├── tags/           # Tags
│   │   ├── timeline/       # Linha do tempo
│   │   ├── gallery/        # Álbuns e fotos
│   │   ├── academic/       # Produção acadêmica
│   │   ├── audit/          # Logs de auditoria
│   │   ├── system_config/  # Configurações do sistema
│   │   └── core/           # Base models, utilitários, seed
│   ├── config/             # Settings, URLs, WSGI, Celery
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/            # Router, providers, layout
│   │   ├── features/       # Páginas e componentes por domínio
│   │   └── shared/         # Componentes, hooks, types, api, i18n
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── docker-compose.override.yml
├── .env.example
├── env-example-prod.txt
├── nginx/
├── scripts/
└── README.md
```

---

## Comandos úteis

### Backend

```bash
cd backend
source .venv/bin/activate

python manage.py migrate                 # Aplicar migrações
python manage.py makemigrations          # Criar migrações
python manage.py seed_data --reset       # Popular com dados de exemplo
python manage.py createsuperuser         # Criar superusuário
python manage.py runserver               # Servidor de desenvolvimento

pytest                                   # Rodar testes
pytest --cov=apps                        # Rodar testes com cobertura

celery -A config worker -l info            # Worker Celery
celery -A config beat -l info              # Celery Beat
```

### Frontend

```bash
cd frontend

npm install                              # Instalar dependências
npm run dev                              # Servidor de desenvolvimento
npm run build                            # Build de produção
npm run preview                          # Preview do build
npm run lint                             # Linter
npm run test                             # Testes (quando configurados)
```

### Docker Compose

```bash
cd cavn-digital

docker-compose up --build                # Subir tudo
docker-compose up -d                     # Subir em background
docker-compose logs -f backend           # Logs do backend
docker-compose logs -f frontend          # Logs do frontend
docker-compose exec backend python manage.py seed_data --reset
docker-compose down -v                   # Parar e remover volumes
```

---

## Testes

### Backend

```bash
cd backend
source .venv/bin/activate
pytest
```

Status atual: **89 testes passando** em 20 arquivos, cobrindo autenticação e JWT, 2FA (TOTP), permissões/RBAC, documentos, workflow de aprovação, serializers, categorias, tags, timeline, galeria, produção acadêmica, auditoria, configurações e validadores de upload.

### Frontend

```bash
cd frontend
npm run test        # testes unitários/componentes (Vitest + Testing Library)
npm run test:e2e    # testes end-to-end (Playwright)
```

O frontend usa **Vitest** com **React Testing Library** e jsdom para testes de unidade/componentes, e **Playwright** para E2E. As specs E2E ficam em `frontend/e2e/` e já cobrem home, busca, autenticação do admin e o fluxo completo (`fluxo-completo.spec.ts`).

---

## Perfis e permissões (RBAC)

| Perfil | Permissões |
|--------|--------------|
| **Visitante** | Visualizar conteúdo publicado no site |
| **Catalogador** | Criar/editar seus próprios rascunhos; enviar para revisão |
| **Curador** | Revisar, aprovar/reprovar e publicar documentos |
| **Administrador** | Acesso total: usuários, configurações, exclusão, admin Django |

As permissões são aplicadas tanto nas rotas da API REST quanto nas telas do React.

---

## Workflow de documentos

```
┌──────────┐      ┌────────────┐      ┌───────────┐      ┌───────────┐      ┌───────────┐
│ Rascunho │ ───▶ │ Em revisão │ ───▶ │ Aprovado  │ ───▶ │ Publicado │ ───▶ │ Arquivado │
└──────────┘      └────────────┘      └───────────┘      └───────────┘      └───────────┘
     │                  │                   │
     │                  │                   │
     ▼                  ▼                   ▼
  (catalogador)     (curador)         (curador/admin)
```

Documentos publicados são visíveis no site público. Rascunhos e documentos em revisão ficam restritos à área administrativa.

---

## Solução de problemas

### Docker Compose: `Cannot connect to the Docker daemon`

Se estiver usando Colima no macOS:

```bash
colima stop
colima start --cpu 4 --memory 8
```

### Erro de permissão em `media/` ou `staticfiles/`

```bash
# Dentro do container backend
docker-compose exec backend chown -R www-data:www-data /app/media /app/staticfiles

# Ou localmente
sudo chown -R $(whoami):$(whoami) backend/media backend/staticfiles
```

### Banco de dados PostgreSQL não inicia

Verifique se a porta `5432` já está em uso. Caso positivo, pare o serviço local ou altere `DB_PORT` no `.env`.

### Frontend não consegue acessar a API

Verifique se `VITE_API_URL` aponta para o backend correto. Para Docker, use:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Para dev local com backend em `localhost:8000`, use o mesmo valor.

### Migrações desatualizadas

```bash
# Local
cd backend
python manage.py migrate

# Docker
docker-compose exec backend python manage.py migrate
```

### macOS pede senha do usuário a cada build/rebuild do Docker

Se aparecer uma caixa de diálogo do sistema pedindo senha ao executar `docker compose up --build`, a causa mais comum é um helper privilegiado antigo do Docker Desktop (`com.docker.vmnetd`) ainda presente no sistema.

1. Execute o script de correção (requer senha do macOS uma única vez):

   ```bash
   cd cavn-digital
   sudo bash scripts/fix-docker-password-prompt.sh
   ```

2. Reinicie o Mac.

O script remove o helper antigo e configura o `sudo` para não pedir senha nos comandos `docker` e `docker compose`.

### Evitar rebuilds a cada alteração de código

Durante o desenvolvimento, use o `docker-compose.override.yml` já incluído no projeto. Ele monta o código do backend como volume e ativa o reload automático do Gunicorn:

```bash
cd cavn-digital
docker compose up -d          # backend recarrega automaticamente
docker compose up -d --build  # apenas quando mudar Dockerfile/requirements
```

Para o frontend em desenvolvimento, prefira o servidor local do Vite (mais rápido):

```bash
cd frontend
npm run dev
```

### Reset completo do ambiente Docker

```bash
cd cavn-digital
docker-compose down -v
docker-compose up --build
```

---

## Checklist de conformidade

- [x] Arquitetura separada: Django (API) + React (UI)
- [x] API REST documentada com OpenAPI/Swagger
- [x] Autenticação JWT com refresh token (em cookie httpOnly)
- [x] Autenticação de dois fatores (2FA / TOTP)
- [x] RBAC com 4 perfis de usuário
- [x] Admin Django modernizado com Django Unfold
- [x] Workflow de aprovação de documentos
- [x] Metadados Dublin Core
- [x] Upload com checksum SHA-256, validação de extensão/MIME e thumbnails
- [x] Acessibilidade básica (WCAG 2.1 / eMAG)
- [x] PWA (service worker via Workbox)
- [x] Docker Compose funcional (dev e produção)
- [x] Testes backend passando (89 testes)
- [x] Testes E2E com Playwright
- [x] Deploy em produção com Nginx + SSL, Celery, backups e Sentry

---

## Próximos passos sugeridos

1. **OCR**: integrar Tesseract na task Celery `process_document_ocr` já preparada (`pytesseract` já consta em `requirements.txt`)
2. **Marca d'água**: adicionar watermark em downloads de imagens
3. **Exportação de metadados**: XML (Dublin Core), JSON, CSV
4. **Feeds**: RSS/Atom para novos documentos
5. **Cobertura de testes frontend**: ampliar os testes de componentes com Vitest/Testing Library
6. **Observabilidade**: complementar o Sentry com métricas (Prometheus/Grafana)

---

## Licença

Projeto desenvolvido como Produto Educacional do ProfEPT para o CAVN/UFPB.
