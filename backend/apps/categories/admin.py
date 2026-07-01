"""Admin de categorias com django-unfold."""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin

from apps.categories.models import Categoria


class CategoriaAdmin(ModelAdmin):
    """Admin para gestão de categorias hierárquicas."""

    list_display = ["nome", "parent", "ordem", "ativo", "created_at"]
    list_filter = ["ativo", "parent"]
    search_fields = ["nome", "descricao"]
    ordering = ["ordem", "nome"]
    prepopulated_fields = {"slug": ("nome",)}
    fieldsets = (
        (None, {"fields": ("nome", "slug", "parent", "descricao")}),
        (_("Apresentação"), {"fields": ("icone", "ordem", "ativo")}),
    )


admin.site.register(Categoria, CategoriaAdmin)
