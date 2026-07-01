"""Modelo de auditoria de ações administrativas."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.constants import AuditAction
from apps.core.models import BaseModel


class Auditoria(BaseModel):
    """Registro imutável de ações no sistema."""

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

    class Meta:
        verbose_name = _("Auditoria")
        verbose_name_plural = _("Auditorias")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.acao} em {self.entidade} ({self.created_at})"
