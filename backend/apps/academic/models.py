"""Modelo de produção acadêmica vinculada à instituição."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class ProducaoAcademica(BaseModel):
    """Trabalho acadêmico (TCC, dissertação, tese, artigo etc.)."""

    class TipoProducao(models.TextChoices):
        TCC = "tcc", _("TCC")
        DISSERTACAO = "dissertacao", _("Dissertação")
        TESE = "tese", _("Tese")
        ARTIGO = "artigo", _("Artigo")
        LIVRO = "livro", _("Livro")
        CAPITULO = "capitulo", _("Capítulo de livro")
        OUTRO = "outro", _("Outro")

    titulo = models.CharField(max_length=500, verbose_name=_("Título"))
    tipo = models.CharField(
        max_length=20,
        choices=TipoProducao.choices,
        default=TipoProducao.OUTRO,
        verbose_name=_("Tipo"),
    )
    autor = models.CharField(max_length=255, verbose_name=_("Autor"))
    orientador = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Orientador"),
    )
    ano = models.PositiveIntegerField(verbose_name=_("Ano"))
    resumo = models.TextField(blank=True, verbose_name=_("Resumo"))
    palavras_chave = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("Palavras-chave"),
    )
    url_acesso = models.URLField(
        blank=True,
        verbose_name=_("URL de acesso"),
    )
    arquivo = models.ForeignKey(
        "documents.Arquivo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="producoes_academicas",
        verbose_name=_("Arquivo"),
    )
    citacao_abnt = models.TextField(
        blank=True,
        verbose_name=_("Citação ABNT"),
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name=_("Ativo"),
    )
    slug = models.SlugField(
        unique=True,
        max_length=500,
        blank=True,
        verbose_name=_("Slug"),
    )

    class Meta:
        verbose_name = _("Produção acadêmica")
        verbose_name_plural = _("Produções acadêmicas")
        ordering = ["-ano", "titulo"]
        indexes = [
            models.Index(fields=["-ano", "titulo"], name="producao_ano_titulo_idx"),
            models.Index(fields=["tipo", "ativo"], name="producao_tipo_ativo_idx"),
            models.Index(fields=["slug"], name="producao_slug_idx"),
        ]

    def __str__(self):
        return f"{self.titulo} ({self.ano})"

    def save(self, *args, **kwargs):
        if not self.slug:
            from apps.core.utils import generate_unique_slug

            self.slug = generate_unique_slug(ProducaoAcademica, self.titulo)
        super().save(*args, **kwargs)
