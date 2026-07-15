#!/usr/bin/env bash
# =============================================================================
# Backup diário do banco de dados e mídia do Repositório Digital CAVN
# =============================================================================
# Uso manual:
#   bash scripts/backup.sh
#
# Recomenda-se agendamento via cron (ex: todos os dias às 02:00):
#   0 2 * * * cd /opt/cavn-digital && bash scripts/backup.sh >> /var/log/cavn-backup.log 2>&1
#
# Todos os arquivos gerados (banco, mídia e .env) são cifrados simetricamente
# com GPG (AES256) usando BACKUP_PASSPHRASE do .env. Sem essa variável, o
# backup falha em vez de gravar segredos em texto puro no disco.
#
# Para descriptografar um arquivo:
#   gpg --batch --yes --passphrase-file <(echo "$BACKUP_PASSPHRASE") \
#       --decrypt db_20260101_020000.sql.gz.gpg > db_20260101_020000.sql.gz
#
# O envio externo pode ser feito via rclone. Quando BACKUP_OFFSITE_REQUIRED=true,
# a ausência do rclone, do remote ou de uma verificação bem-sucedida interrompe
# o backup para evitar uma falsa sensação de recuperação em desastre.
# =============================================================================
set -euo pipefail

PROJECT_DIR="/opt/cavn-digital"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/cavn-digital-backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Carrega variáveis do .env se existirem
if [[ -f "${PROJECT_DIR}/.env" ]]; then
  # shellcheck source=/dev/null
  set -a
  # shellcheck source=/dev/null
  source "${PROJECT_DIR}/.env"
  set +a
fi

if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
  echo "ERRO: BACKUP_PASSPHRASE não configurada no .env — recuse fazer backup" \
       "sem cifrar (evita gravar segredos em texto puro em disco/storage externo)." >&2
  echo "Gere uma com: python3 -c \"import secrets; print(secrets.token_urlsafe(32))\"" >&2
  exit 1
fi

DB_USER="${DB_USER:-cavn_digital}"
DB_NAME="${DB_NAME:-cavn_digital}"

encrypt_and_remove() {
  local plain_file="$1"
  local encrypted_file="${plain_file}.gpg"
  gpg --batch --yes --pinentry-mode loopback \
      --passphrase-file <(printf '%s' "${BACKUP_PASSPHRASE}") \
      --cipher-algo AES256 --symmetric --output "${encrypted_file}" "${plain_file}"
  rm -f "${plain_file}"
  chmod 600 "${encrypted_file}"
  echo "${encrypted_file}"
}

echo "==> Iniciando backup em ${TIMESTAMP}"
cd "${PROJECT_DIR}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Backup do banco de dados
echo "==> Fazendo backup do banco de dados..."
DB_BACKUP="${BACKUP_DIR}/db_${TIMESTAMP}.sql"
docker compose -f "${COMPOSE_FILE}" exec -T db pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${DB_BACKUP}"
gzip -f "${DB_BACKUP}"
DB_BACKUP_ENC=$(encrypt_and_remove "${DB_BACKUP}.gz")
echo "    Banco: ${DB_BACKUP_ENC}"

# Backup da pasta media
echo "==> Fazendo backup da pasta media..."
MEDIA_BACKUP="${BACKUP_DIR}/media_${TIMESTAMP}.tar.gz"
tar -czf "${MEDIA_BACKUP}" -C "${PROJECT_DIR}/backend" media
MEDIA_BACKUP_ENC=$(encrypt_and_remove "${MEDIA_BACKUP}")
echo "    Mídia: ${MEDIA_BACKUP_ENC}"

# Backup do .env
echo "==> Fazendo backup do .env..."
ENV_BACKUP="${BACKUP_DIR}/env_${TIMESTAMP}"
cp "${PROJECT_DIR}/.env" "${ENV_BACKUP}"
ENV_BACKUP_ENC=$(encrypt_and_remove "${ENV_BACKUP}")
echo "    .env: ${ENV_BACKUP_ENC}"

# Rotação: remove backups mais antigos que RETENTION_DAYS
echo "==> Removendo backups mais antigos que ${RETENTION_DAYS} dias..."
find "${BACKUP_DIR}" -type f -name "db_*.sql.gz.gpg" -mtime +"${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name "media_*.tar.gz.gpg" -mtime +"${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name "env_*.gpg" -mtime +"${RETENTION_DAYS}" -delete

BACKUP_OFFSITE_ENABLED="${BACKUP_OFFSITE_ENABLED:-false}"
BACKUP_OFFSITE_REQUIRED="${BACKUP_OFFSITE_REQUIRED:-false}"
OFFSITE_PATH="${RCLONE_REMOTE:-}/$(date +%Y/%m)/"

if [[ "${BACKUP_OFFSITE_ENABLED,,}" == "true" || "${BACKUP_OFFSITE_REQUIRED,,}" == "true" ]]; then
  if [[ -z "${RCLONE_REMOTE:-}" ]]; then
    echo "ERRO: backup externo exigido/habilitado, mas RCLONE_REMOTE não está configurado." >&2
    exit 1
  fi
  if ! command -v rclone >/dev/null 2>&1; then
    echo "ERRO: backup externo exigido/habilitado, mas rclone não está instalado." >&2
    exit 1
  fi

  echo "==> Sincronizando backups com storage externo (${OFFSITE_PATH})..."
  rclone copy "${BACKUP_DIR}/" "${OFFSITE_PATH}" --checksum --transfers=4 --checkers=8
  rclone check "${BACKUP_DIR}/" "${OFFSITE_PATH}" --one-way
  echo "    Sincronização e verificação concluídas."
  OFFSITE_STATUS="ativo e verificado"
else
  OFFSITE_STATUS="desativado (configure BACKUP_OFFSITE_ENABLED=true quando houver um remote)"
fi

echo "==> Backup concluído com sucesso."
echo "    Arquivos em: ${BACKUP_DIR}"
echo "    Offsite: ${OFFSITE_STATUS}"
