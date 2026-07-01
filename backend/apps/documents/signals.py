"""Signals para auditoria automática de documentos."""

from django.db.models.signals import post_delete, pre_save, post_save
from django.dispatch import receiver

from apps.audit.services import AuditoriaService
from apps.documents.models import Document

_AUDIT_FIELDS = [
    "titulo", "status", "tipo_documento", "data_documento",
    "descricao", "resumo", "direitos", "idioma",
]


def _snapshot(instance):
    data = {f: getattr(instance, f, None) for f in _AUDIT_FIELDS}
    if data.get("data_documento"):
        data["data_documento"] = str(data["data_documento"])
    return data


@receiver(pre_save, sender=Document)
def capture_document_pre_save(sender, instance, **kwargs):
    """Captura o estado anterior para diff de auditoria."""
    if instance.pk:
        try:
            instance._pre_save_snapshot = _snapshot(
                Document.objects.get(pk=instance.pk)
            )
        except Document.DoesNotExist:
            instance._pre_save_snapshot = {}
    else:
        instance._pre_save_snapshot = {}


@receiver(post_save, sender=Document)
def log_document_save(sender, instance, created, **kwargs):
    """Registra criação ou atualização de documentos na auditoria."""
    acao = "criar" if created else "atualizar"
    usuario = getattr(instance, "_audit_user", None) or instance.created_by
    dados_anteriores = {} if created else getattr(instance, "_pre_save_snapshot", {})
    dados_novos = _snapshot(instance)
    AuditoriaService.registrar(
        usuario=usuario,
        acao=acao,
        entidade="Document",
        entidade_id=str(instance.pk),
        dados_anteriores=dados_anteriores,
        dados_novos=dados_novos,
    )


@receiver(post_delete, sender=Document)
def log_document_delete(sender, instance, **kwargs):
    """Registra exclusão física de documentos na auditoria."""
    AuditoriaService.registrar(
        usuario=getattr(instance, "_audit_user", None),
        acao="excluir",
        entidade="Document",
        entidade_id=str(instance.pk),
        dados_anteriores=_snapshot(instance),
        dados_novos={},
    )
