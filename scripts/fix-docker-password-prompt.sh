#!/usr/bin/env bash
# =============================================================================
# Corrige solicitações repetidas de senha do macOS ao usar Docker/Colima.
# Execute com: sudo bash scripts/fix-docker-password-prompt.sh
# =============================================================================
set -euo pipefail

USER_NAME="${SUDO_USER:-$(whoami)}"

echo "==> Removendo helper privilegiado antigo do Docker Desktop (se existir)..."
if [ -f "/Library/PrivilegedHelperTools/com.docker.vmnetd" ]; then
    launchctl remove com.docker.vmnetd 2>/dev/null || true
    rm -f /Library/PrivilegedHelperTools/com.docker.vmnetd
    echo "    com.docker.vmnetd removido."
else
    echo "    com.docker.vmnetd não encontrado."
fi

echo "==> Configurando sudo sem senha para docker e docker compose..."
SUDOERS_FILE="/etc/sudoers.d/docker-nopasswd"
DOCKER_BIN="$(command -v docker || true)"
COMPOSE_BIN="$(command -v docker-compose || true)"

if [ -n "$DOCKER_BIN" ] || [ -n "$COMPOSE_BIN" ]; then
    cat > "$SUDOERS_FILE" <<EOF
# Permite que $USER_NAME execute docker sem digitar senha.
$USER_NAME ALL=(ALL) NOPASSWD: $DOCKER_BIN, $COMPOSE_BIN
EOF
    chmod 440 "$SUDOERS_FILE"
    echo "    Regra criada em $SUDOERS_FILE"
else
    echo "    docker/docker-compose não encontrados no PATH."
fi

echo "==> Verificando permissões do socket do Colima..."
COLIMA_SOCKET="$HOME/.colima/default/docker.sock"
if [ -S "$COLIMA_SOCKET" ]; then
    chown "$USER_NAME:staff" "$COLIMA_SOCKET" 2>/dev/null || true
    chmod 600 "$COLIMA_SOCKET" 2>/dev/null || true
    echo "    Socket ajustado."
fi

echo "==> Pronto. Reinicie o Mac para garantir que nenhum helper antigo fique ativo."
