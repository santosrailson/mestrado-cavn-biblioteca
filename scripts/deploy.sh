#!/usr/bin/env bash
# =============================================================================
# Deploy automatizado e seguro do Repositório Digital CAVN
# =============================================================================
# Execute este script NA VPS. Ele faz backup, preserva dados sensíveis
# e sobe os containers Docker.
#
# Uso:
#   bash scripts/deploy.sh
#
# Para sincronizar código da máquina local antes de executar:
#   bash scripts/sync-code.sh root@SEU_HOST -p 77
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

echo "==> Entrando no diretório do projeto: ${PROJECT_DIR}"
cd "${PROJECT_DIR}"

# Verifica se .env existe; se não, aborta para evitar subir com configuração vazia
if [[ ! -f .env ]]; then
  echo "ERRO: arquivo .env não encontrado em ${PROJECT_DIR}"
  echo "Crie o .env antes de executar o deploy."
  exit 1
fi

# Valida configurações críticas de segurança
if [[ "${SECRET_KEY:-}" == "ALTERE-ESSA-CHAVE-GERE-UMA-NOVA" || -z "${SECRET_KEY:-}" ]]; then
  echo "ERRO: SECRET_KEY não configurada ou é o valor de exemplo."
  exit 1
fi

if [[ "${DEBUG:-True}" == "True" || "${DEBUG:-true}" == "true" ]]; then
  echo "AVISO: DEBUG está ativo no .env. Isso não é recomendado em produção."
fi

# Backup completo antes do deploy
echo "==> Executando backup antes do deploy..."
bash scripts/backup.sh || {
  echo "ERRO: falha no backup. Abortando deploy para evitar perda de dados."
  exit 1
}

echo "==> Rebuildando e subindo containers..."
docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" up -d --build

echo "==> Aguardando serviços ficarem saudáveis..."
docker compose -f "${COMPOSE_FILE}" exec -T db pg_isready -U "${DB_USER:-cavn_digital}" -d "${DB_NAME:-cavn_digital}" > /dev/null 2>&1 || sleep 5

echo "==> Aplicando migrações..."
docker compose -f "${COMPOSE_FILE}" exec backend python manage.py migrate --noinput

echo "==> Coletando arquivos estáticos..."
docker compose -f "${COMPOSE_FILE}" exec backend python manage.py collectstatic --noinput

echo "==> Aguardando healthcheck do backend..."
for i in {1..30}; do
  # Envia X-Forwarded-Proto: https como o Nginx faria, evitando o redirect 301
  # do SECURE_SSL_REDIRECT quando testado diretamente na porta interna do backend.
  HTTP_BACKEND=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Forwarded-Proto: https" http://127.0.0.1:8000/api/v1/health/ready/ || echo "000")
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

echo "==> Sincronizando configuração do Nginx do host..."
NGINX_SITE="/etc/nginx/sites-enabled/bibliotecadigital.cchsa-cavn.tec.br"
if command -v nginx >/dev/null 2>&1; then
  if [[ -f "${NGINX_SITE}" ]]; then
    cp "${PROJECT_DIR}/nginx/host-nginx.conf" "${NGINX_SITE}"
    # Ajusta o location do admin para coincidir com ADMIN_URL (remove barra final).
    ADMIN_PATH="${ADMIN_URL:-gerencia/}"
    ADMIN_PATH="${ADMIN_PATH%/}"
    sed -i "s/|gerencia)/|${ADMIN_PATH})/g" "${NGINX_SITE}"
  fi
  nginx -t || {
    echo "ERRO: configuração do Nginx inválida. Corrija antes de prosseguir."
    exit 1
  }
  systemctl reload nginx || true
fi

echo "==> Limpando imagens e containers órfãos..."
docker system prune -f --volumes=false

echo "==> Deploy concluído com sucesso!"
echo "    Backend healthcheck:  http://127.0.0.1:8000/api/v1/health/ready/  (${HTTP_BACKEND})"
echo "    Frontend:             http://127.0.0.1:3000/               (${HTTP_FRONTEND})"
