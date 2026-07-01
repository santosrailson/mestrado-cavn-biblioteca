"""Modelos de álbuns e fotos da galeria."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Album(BaseModel):
    """Álbum temático de fotografias históricas."""

    titulo = models.CharField(max_length=255, verbose_name=_("Título"))
    descricao = models.TextField(blank=True, verbose_name=_("Descrição"))
    capa = models.ImageField(
        upload_to="gallery/albuns/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("Capa"),
    )
    destaque = models.BooleanField(
        default=False,
        verbose_name=_("Destaque"),
    )
    slug = models.SlugField(unique=True, max_length=255, verbose_name=_("Slug"))

    class Meta:
        verbose_name = _("Álbum")
        verbose_name_plural = _("Álbuns")
        ordering = ["-destaque", "-created_at"]
        indexes = [
            models.Index(fields=["-destaque", "-created_at"], name="album_destaque_created_idx"),
        ]

    def __str__(self):
        return self.titulo


class Foto(BaseModel):
    """Foto individual vinculada a um álbum."""

    album = models.ForeignKey(
        Album,
        on_delete=models.CASCADE,
        related_name="fotos",
        verbose_name=_("Álbum"),
    )
    imagem = models.ImageField(
        upload_to="gallery/fotos/%Y/%m/",
        verbose_name=_("Imagem"),
    )
    legenda = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("Legenda"),
    )
    ordem = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Ordem"),
    )

    class Meta:
        verbose_name = _("Foto")
        verbose_name_plural = _("Fotos")
        ordering = ["album", "ordem", "created_at"]
        indexes = [
            models.Index(fields=["album", "ordem", "created_at"], name="foto_album_ordem_idx"),
        ]

    def __str__(self):
        return f"{self.album} — {self.legenda or self.imagem.name}"
