"""Modelo de eventos da linha do tempo histórica."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.constants import DatePrecision
from apps.core.models import BaseModel


class TimelineEvent(BaseModel):
    """Evento histórico exibido na linha do tempo interativa."""

    titulo = models.CharField(max_length=255, verbose_name=_("Título"))
    descricao = models.TextField(blank=True, verbose_name=_("Descrição"))
    data_evento = models.DateField(verbose_name=_("Data do evento"))
    data_precisao = models.CharField(
        max_length=20,
        choices=DatePrecision.choices,
        default=DatePrecision.EXACT,
        verbose_name=_("Precisão da data"),
    )
    imagem_destaque = models.ImageField(
        upload_to="timeline/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("Imagem de destaque"),
    )
    documento = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_events",
        verbose_name=_("Documento relacionado"),
    )
    destaque = models.BooleanField(
        default=False,
        verbose_name=_("Destaque"),
    )
    ordem = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Ordem"),
    )

    class Meta:
        verbose_name = _("Evento da linha do tempo")
        verbose_name_plural = _("Eventos da linha do tempo")
        ordering = ["data_evento", "ordem", "-created_at"]
        indexes = [
            models.Index(fields=["data_evento", "ordem", "-created_at"], name="timeline_event_order_idx"),
            models.Index(fields=["destaque"], name="timeline_event_destaque_idx"),
            models.Index(fields=["documento"], name="timeline_event_documento_idx"),
        ]

    def __str__(self):
        return f"{self.data_evento.year} — {self.titulo}"
