#!/usr/bin/env bash
# =============================================================================
# Redeploy rápido para uso quando você edita o código diretamente na VPS
# =============================================================================
# Não faz backup. Apenas rebuilda e sobe os containers.
#
# Uso:
#   bash scripts/redeploy.sh
# =============================================================================
set -euo pipefail

PROJECT_DIR="/opt/cavn-digital"
COMPOSE_FILE="docker-compose.prod.yml"

# Carrega variáveis do .env
if [[ -f "${PROJECT_DIR}/.env" ]]; then
  # shellcheck source=/dev/null
  set -a
  # shellcheck source=/dev/null
  source "${PROJECT_DIR}/.env"
  set +a
fi

cd "${PROJECT_DIR}"

echo "==> Rebuildando e subindo containers..."
docker compose -f "${COMPOSE_FILE}" up -d --build

echo "==> Aguardando serviços ficarem saudáveis..."
docker compose -f "${COMPOSE_FILE}" exec -T db pg_isready -U "${DB_USER:-cavn_digital}" -d "${DB_NAME:-cavn_digital}" > /dev/null 2>&1 || sleep 5

echo "==> Aplicando migrações..."
docker compose -f "${COMPOSE_FILE}" exec backend python manage.py migrate --noinput

echo "==> Coletando arquivos estáticos..."
docker compose -f "${COMPOSE_FILE}" exec backend python manage.py collectstatic --noinput

echo "==> Aguardando healthcheck do backend..."
for i in {1..30}; do
  HTTP_BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/v1/health/ || echo "000")
  if [[ "${HTTP_BACKEND}" == "200" ]]; then
    break
  fi
  sleep 2
done

if [[ "${HTTP_BACKEND}" != "200" ]]; then
  echo "ERRO: backend healthcheck retornou ${HTTP_BACKEND}"
  docker compose -f "${COMPOSE_FILE}" logs --tail=50 backend
  exit 1
fi

echo "==> Verificando frontend..."
HTTP_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || echo "000")
if [[ "${HTTP_FRONTEND}" != "200" && "${HTTP_FRONTEND}" != "304" ]]; then
  echo "ERRO: frontend retornou ${HTTP_FRONTEND}"
  exit 1
fi

echo "==> Redeploy concluído com sucesso!"
echo "    Backend healthcheck:  http://127.0.0.1:8000/api/v1/health/  (${HTTP_BACKEND})"
echo "    Frontend:             http://127.0.0.1:3000/               (${HTTP_FRONTEND})"
