#!/usr/bin/env bash
# =============================================================================
# Limpeza de imagens Docker antigas — Repositório Digital CAVN
# =============================================================================
# Uso manual:
#   bash scripts/cleanup-images.sh
#
# Recomenda-se agendamento via cron (ex: todos os dias às 03:30, após o
# backup das 02:00):
#   30 3 * * * cd /opt/cavn-digital && bash scripts/cleanup-images.sh >> /var/log/cavn-cleanup.log 2>&1
#
# `docker image prune` só remove imagens SEM nenhum container associado
# (rodando ou parado) — nunca remove a imagem em uso pelos containers atuais.
# O filtro `until` mantém, além disso, uma janela de retenção: imagens órfãs
# mais recentes que RETENTION_HOURS são preservadas, dando tempo de detectar
# problemas pós-deploy e fazer rollback antes da limpeza definitiva.
# =============================================================================
set -euo pipefail

RETENTION_HOURS="${IMAGE_CLEANUP_RETENTION_HOURS:-120}"  # 5 dias por padrão

echo "==> Limpando imagens Docker órfãs com mais de ${RETENTION_HOURS}h..."
docker image prune -af --filter "until=${RETENTION_HOURS}h"

echo "==> Limpando cache de build com mais de ${RETENTION_HOURS}h..."
docker builder prune -f --filter "until=${RETENTION_HOURS}h"

echo "==> Limpeza concluída."
docker system df
