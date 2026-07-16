#!/usr/bin/env bash
# Gates defensivos locais; não substitui pentest ou auditoria independente.
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_DIR"

echo "==> Verificando migrações e configuração Django"
(cd backend && ./.venv-linux/bin/python manage.py makemigrations --check --dry-run)
(cd backend && ./.venv-linux/bin/python manage.py check --deploy)

echo "==> Verificando CSP e storage privado"
if rg -n "script-src[^;]*unsafe-inline|script-src[^;]*cloudflare" \
  frontend/index.html frontend/nginx.conf nginx/host-nginx.conf; then
  echo "ERRO: CSP permite script inline ou script externo não autorizado." >&2
  exit 1
fi
rg -n 'location /media/documentos/|return 404' frontend/nginx.conf nginx/host-nginx.conf >/dev/null
rg -n 'location /media-protected/|internal;' frontend/nginx.conf nginx/host-nginx.conf >/dev/null

echo "==> Auditoria de dependências (quando instalada no ambiente)"
if command -v pip-audit >/dev/null 2>&1; then
  (cd backend && pip-audit -r requirements.txt)
else
  echo "AVISO: pip-audit não instalado; o job de CI executa esta etapa."
fi
if command -v npm >/dev/null 2>&1; then
  (cd frontend && npm audit --audit-level=high)
fi

echo "Baseline local concluído. Pentest, revisão jurídica e auditoria externa permanecem fora deste script."
