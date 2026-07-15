# Retenção, descarte e anonimização

## Controles implementados

- Analytics é armazenado sem identificador direto e pode ser removido por idade:
  `python manage.py retention_cleanup --days 180 --dry-run`.
- A remoção exige confirmação explícita:
  `python manage.py retention_cleanup --days 180 --confirm`.
- Auditoria administrativa é append-only e encadeada por SHA-256; sua integridade é verificada com:
  `python manage.py audit_integrity`.
- Backups são cifrados e devem seguir a retenção operacional definida em `scripts/backup.sh`.

## Pendências que exigem decisão institucional

- Confirmar prazos e bases legais com o encarregado/DPO e assessoria jurídica.
- Definir política arquivística para documentos permanentes, inclusive cópias de preservação.
- Definir procedimento de atendimento a eliminação, acesso, correção e portabilidade sem apagar evidências de segurança obrigatórias.
- Registrar cada execução de descarte em ticket ou change record.
