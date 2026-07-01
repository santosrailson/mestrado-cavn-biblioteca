#!/usr/bin/env bash
# =============================================================================
# Setup de backup offsite automático para o Repositório Digital CAVN
# =============================================================================
# Este script configura:
#   1. Instalação do rclone (se ausente)
#   2. Criação do remote rclone (solicita configuração manual)
#   3. Agendamento do cron diário para backup.sh + sync offsite
#
# Uso:
#   sudo bash scripts/setup-offsite-backup.sh
# =============================================================================
set -euo pipefail

PROJECT_DIR="/opt/cavn-digital"
BACKUP_SCRIPT="${PROJECT_DIR}/scripts/backup.sh"
RCLONE_CONF="/root/.config/rclone/rclone.conf"

echo "==> Setup de Backup Offsite - Repositório Digital CAVN"
echo ""

# 1. Verifica/instala rclone
if ! command -v rclone &>/dev/null; then
    echo "==> Instalando rclone..."
    curl -fsSL https://rclone.org/install.sh | bash
    echo "    rclone instalado: $(rclone --version | head -1)"
else
    echo "==> rclone já instalado: $(rclone --version | head -1)"
fi

# 2. Configura remote (se não existir)
if [[ ! -f "${RCLONE_CONF}" ]]; then
    echo ""
    echo "==> Nenhum remote rclone encontrado."
    echo ""
    echo "Você precisa configurar um storage externo (S3, Backblaze B2, Google Drive, etc.)"
    echo ""
    echo "Exemplos de configuração:"
    echo "  rclone config"
    echo ""
    echo "  Backblaze B2:"
    echo "    - Type: b2"
    echo "    - Account ID ou Application Key ID"
    echo "    - Application Key"
    echo ""
    echo "  AWS S3:"
    echo "    - Type: s3"
    echo "    - Provider: AWS"
    echo "    - Access Key ID + Secret Access Key"
    echo ""
    echo "  Google Drive:"
    echo "    - Type: drive"
    echo "    - Client ID + Client Secret (ou config automatic)"
    echo ""
    echo "Após configurar, execute novamente este script para agendar o cron."
    echo ""
    read -rp "Deseja configurar o rclone agora? (s/N): " setup_now
    if [[ "${setup_now}" =~ ^[sSyY] ]]; then
        rclone config
    else
        echo "Execute 'rclone config' manualmente e depois rode este script novamente."
        exit 0
    fi
fi

# 3. Lista remotes disponíveis
echo ""
echo "==> Remotes rclone disponíveis:"
rclone listremotes | cat

# 4. Solicita escolha do remote
echo ""
read -rp "Digite o nome do remote para backups (ex: s3:cavn-backups, b2:meu-bucket): " RCLONE_REMOTE

if [[ -z "${RCLONE_REMOTE}" ]]; then
    echo "ERRO: Remote não informado. Abortando."
    exit 1
fi

# 5. Testa conectividade
echo "==> Testando conexão com ${RCLONE_REMOTE}..."
if rclone ls "${RCLONE_REMOTE}" &>/dev/null; then
    echo "    Conexão OK!"
else
    echo "    AVISO: Não foi possível listar ${RCLONE_REMOTE}."
    echo "    Verifique o nome do remote e as credenciais."
    read -rp "Continuar mesmo assim? (s/N): " force
    if [[ ! "${force}" =~ ^[sSyY] ]]; then
        exit 1
    fi
fi

# 6. Adiciona RCLONE_REMOTE ao .env
echo "==> Adicionando RCLONE_REMOTE ao .env..."
if grep -q "^RCLONE_REMOTE=" "${PROJECT_DIR}/.env" 2>/dev/null; then
    sed -i "s|^RCLONE_REMOTE=.*|RCLONE_REMOTE=${RCLONE_REMOTE}|" "${PROJECT_DIR}/.env"
else
    echo "" >> "${PROJECT_DIR}/.env"
    echo "# Backup offsite (rclone)" >> "${PROJECT_DIR}/.env"
    echo "RCLONE_REMOTE=${RCLONE_REMOTE}" >> "${PROJECT_DIR}/.env"
fi
echo "    RCLONE_REMOTE=${RCLONE_REMOTE}"

# 7. Agenda cron diário (se não existir)
CRON_JOB="0 2 * * * cd ${PROJECT_DIR} && bash scripts/backup.sh >> /var/log/cavn-backup.log 2>&1"
EXISTING_CRON=$(crontab -l 2>/dev/null || true)

if echo "${EXISTING_CRON}" | grep -q "scripts/backup.sh"; then
    echo "==> Cron job já existe para backup.sh"
else
    echo "==> Agendando cron diário (02:00)..."
    (echo "${EXISTING_CRON}"; echo "${CRON_JOB}") | crontab -
    echo "    Cron adicionado:"
    echo "    ${CRON_JOB}"
fi

# 8. Testa o backup com sync offsite
echo ""
echo "==> Deseja testar o backup agora (incluindo sync offsite)?"
read -rp "  Isso executará backup.sh completo. Continuar? (s/N): " test_now
if [[ "${test_now}" =~ ^[sSyY] ]]; then
    echo "==> Executando backup de teste..."
    RCLONE_REMOTE="${RCLONE_REMOTE}" bash "${BACKUP_SCRIPT}"
fi

echo ""
echo "==> Setup concluído!"
echo "    Remote: ${RCLONE_REMOTE}"
echo "    Cron:   Diário às 02:00"
echo "    Log:    /var/log/cavn-backup.log"
echo ""
echo "Para testar manualmente:"
echo "  RCLONE_REMOTE=${RCLONE_REMOTE} bash ${BACKUP_SCRIPT}"
