#!/usr/bin/env bash
# =============================================================================
# Sincroniza código-fonte local com a VPS de forma segura
# =============================================================================
# Preserva arquivos sensíveis e dados persistentes na VPS (.env, media, etc.).
#
# Uso:
#   bash scripts/sync-code.sh [USUARIO@HOST] [PORTA]
#
# Exemplo:
#   bash scripts/sync-code.sh root@76.13.224.157 77
# =============================================================================
set -euo pipefail

REMOTE="${1:-root@76.13.224.157}"
PORT="${2:-77}"
REMOTE_DIR="/opt/cavn-digital"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

echo "==> Sincronizando código com ${REMOTE}:${REMOTE_DIR}"
echo "==> Arquivos protegidos na VPS: .env, media/, staticfiles/, .venv/"

rsync -avz --delete \
  --filter="merge ${PROJECT_DIR}/.rsync-filter" \
  -e "ssh -p ${PORT}" \
  "${PROJECT_DIR}/" \
  "${REMOTE}:${REMOTE_DIR}/"

echo "==> Código sincronizado com sucesso."
echo "==> Agora execute na VPS:"
echo "    ssh -p ${PORT} ${REMOTE} 'cd ${REMOTE_DIR} && bash scripts/deploy.sh'"
