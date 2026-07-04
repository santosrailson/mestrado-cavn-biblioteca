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
