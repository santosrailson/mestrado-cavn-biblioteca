"""Admin de tags com django-unfold."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.tags.models import Tag


class TagAdmin(ModelAdmin):
    """Admin para gestão de tags."""

    list_display = ["nome", "slug", "contagem_uso", "created_at"]
    search_fields = ["nome"]
    ordering = ["nome"]
    prepopulated_fields = {"slug": ("nome",)}


admin.site.register(Tag, TagAdmin)
