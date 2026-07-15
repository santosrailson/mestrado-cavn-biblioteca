"""Modelo de auditoria de ações administrativas."""

import hashlib
import json

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.constants import AuditAction
from apps.core.models import BaseModel


class Auditoria(BaseModel):
    """Registro imutável e encadeado de ações no sistema."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias",
        verbose_name=_("Usuário"),
    )
    acao = models.CharField(
        max_length=20,
        choices=AuditAction.choices,
        verbose_name=_("Ação"),
    )
    entidade = models.CharField(
        max_length=100,
        verbose_name=_("Entidade"),
    )
    entidade_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("ID da entidade"),
    )
    dados_anteriores = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Dados anteriores"),
    )
    dados_novos = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Dados novos"),
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("Endereço IP"),
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name=_("User-Agent"),
    )
    previous_hash = models.CharField(
        max_length=64,
        blank=True,
        editable=False,
        verbose_name=_("Hash anterior"),
    )
    integrity_hash = models.CharField(
        max_length=64,
        blank=True,
        editable=False,
        verbose_name=_("Hash de integridade"),
    )

    class Meta:
        verbose_name = _("Auditoria")
        verbose_name_plural = _("Auditorias")
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["created_at", "id"], name="audit_chain_order_idx")]

    def __str__(self):
        return f"{self.acao} em {self.entidade} ({self.created_at})"

    def _integrity_payload(self):
        return {
            "id": str(self.id),
            "usuario_id": str(self.usuario_id) if self.usuario_id else None,
            "acao": self.acao,
            "entidade": self.entidade,
            "entidade_id": self.entidade_id,
            "dados_anteriores": self.dados_anteriores,
            "dados_novos": self.dados_novos,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "previous_hash": self.previous_hash,
        }

    def calculate_integrity_hash(self):
        payload = json.dumps(
            self._integrity_payload(), sort_keys=True, ensure_ascii=False, separators=(",", ":")
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Registros de auditoria são imutáveis.")
        if not self.integrity_hash:
            self.integrity_hash = self.calculate_integrity_hash()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Registros de auditoria não podem ser excluídos.")
