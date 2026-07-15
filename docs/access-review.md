# Revisão periódica de acessos

Executar mensalmente em produção e anexar a saída ao registro de mudança:

```bash
docker compose -f docker-compose.prod.yml exec backend \
  python manage.py access_review --inactive-days 90
```

O relatório sinaliza perfis privilegiados sem login recente e contas sem 2FA confirmado. O responsável deve confirmar necessidade, desativar contas sem justificativa e registrar exceções.

Segregação implementada: o usuário que criou um documento não pode aprová-lo nem publicá-lo; outro curador ou administrador deve executar a etapa de moderação.
