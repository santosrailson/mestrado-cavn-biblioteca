"""Modelos base reutilizáveis entre os apps."""

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    """Modelo abstrato com campos de auditoria padrão."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Criado em"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Atualizado em"))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
        verbose_name=_("Criado por"),
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class SlugModel(BaseModel):
    """Modelo abstrato com slug auto-gerado a partir do nome/título."""

    slug = models.SlugField(unique=True, max_length=255, verbose_name=_("Slug"))

    class Meta:
        abstract = True
