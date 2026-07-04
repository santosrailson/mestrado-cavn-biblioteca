"""Signals para auditoria automática de usuários."""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.audit.services import AuditoriaService
from apps.users.models import User


@receiver(post_save, sender=User)
def log_user_save(sender, instance, created, update_fields=None, **kwargs):
    """Registra criação ou atualização de usuários na auditoria.

    Ignora saves que atualizam apenas ``last_login`` (disparados
    automaticamente pelo JWT em toda autenticação bem-sucedida) para evitar
    poluir a tabela de auditoria com alterações que não representam mudanças
    administrativas reais.
    """
    if not created:
        updated = set(update_fields) if update_fields else None
        if updated == {"last_login"}:
            return

    AuditoriaService.registrar(
        usuario=instance,
        acao="criar" if created else "atualizar",
        entidade="User",
        entidade_id=str(instance.pk),
        dados_novos={"email": instance.email, "role": instance.role, "ativo": instance.is_active},
    )


@receiver(post_delete, sender=User)
def log_user_delete(sender, instance, **kwargs):
    """Registra exclusão de usuários na auditoria."""
    AuditoriaService.registrar(
        usuario=None,
        acao="excluir",
        entidade="User",
        entidade_id=str(instance.pk),
        dados_anteriores={"email": instance.email, "role": instance.role},
    )
