"""Modelo de tags para indexação livre de documentos."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import SlugModel
from apps.core.utils import generate_unique_slug


class Tag(SlugModel):
    """Tag livre associada a documentos."""

    nome = models.CharField(max_length=100, verbose_name=_("Nome"))
    contagem_uso = models.PositiveIntegerField(
        default=0, verbose_name=_("Contagem de uso")
    )

    class Meta:
        verbose_name = _("Tag")
        verbose_name_plural = _("Tags")
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["nome"], name="tag_nome_idx"),
        ]

    def __str__(self):
        return self.nome

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Tag, self.nome)
        super().save(*args, **kwargs)
