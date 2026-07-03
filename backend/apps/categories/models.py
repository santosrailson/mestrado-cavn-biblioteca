"""Modelo de categorias hierárquicas para organização do acervo."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import SlugModel
from apps.core.utils import generate_unique_slug


class Categoria(SlugModel):
    """Categoria hierárquica de documentos."""

    nome = models.CharField(max_length=255, verbose_name=_("Nome"))
    descricao = models.TextField(blank=True, verbose_name=_("Descrição"))
    icone = models.CharField(max_length=50, blank=True, verbose_name=_("Ícone"))
    ordem = models.PositiveIntegerField(default=0, verbose_name=_("Ordem"))
    ativo = models.BooleanField(default=True, verbose_name=_("Ativo"))
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name=_("Categoria pai"),
    )

    class Meta:
        verbose_name = _("Categoria")
        verbose_name_plural = _("Categorias")
        ordering = ["ordem", "nome"]
        indexes = [
            models.Index(fields=["ordem", "nome"], name="categoria_ordem_nome_idx"),
            models.Index(fields=["ativo"], name="categoria_ativo_idx"),
            models.Index(fields=["parent"], name="categoria_parent_idx"),
        ]

    def __str__(self):
        if self.parent:
            return f"{self.parent} > {self.nome}"
        return self.nome

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Categoria, self.nome)
        super().save(*args, **kwargs)

    def get_full_path(self):
        """Retorna a hierarquia completa da categoria."""
        # Usa pai pré-carregado quando disponível (evita N+1 em serializers).
        parent_cache = getattr(self, "_prefetched_parent_cache", None)
        if parent_cache is not None:
            if isinstance(parent_cache, Categoria):
                parent = parent_cache
            else:
                parent = next(iter(parent_cache), None)
                if parent is not None and parent.id != self.parent_id:
                    parent = None
        elif self.parent_id:
            parent = self.parent
        else:
            parent = None

        if parent:
            return f"{parent.get_full_path()} > {self.nome}"
        return self.nome
