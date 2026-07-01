"""Modelo de configurações chave-valor do sistema."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Configuracao(BaseModel):
    """Configuração dinâmica do sistema."""

    class Tipo(models.TextChoices):
        STRING = "string", _("Texto")
        INTEGER = "integer", _("Inteiro")
        BOOLEAN = "boolean", _("Booleano")
        JSON = "json", _("JSON")

    chave = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Chave"),
    )
    valor = models.TextField(verbose_name=_("Valor"))
    tipo = models.CharField(
        max_length=20,
        choices=Tipo.choices,
        default=Tipo.STRING,
        verbose_name=_("Tipo"),
    )
    descricao = models.TextField(
        blank=True,
        verbose_name=_("Descrição"),
    )

    class Meta:
        verbose_name = _("Configuração")
        verbose_name_plural = _("Configurações")
        ordering = ["chave"]

    def __str__(self):
        return self.chave

    def get_valor(self):
        """Converte o valor para o tipo correto."""
        if self.tipo == self.Tipo.BOOLEAN:
            return self.valor.lower() in ("true", "1", "yes", "sim")
        if self.tipo == self.Tipo.INTEGER:
            try:
                return int(self.valor)
            except ValueError:
                return 0
        return self.valor
