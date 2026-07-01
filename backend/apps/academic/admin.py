"""Admin de produção acadêmica com django-unfold."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.academic.models import ProducaoAcademica


class ProducaoAcademicaAdmin(ModelAdmin):
    """Admin para produção acadêmica."""

    list_display = ["titulo", "tipo", "autor", "ano", "ativo", "created_at"]
    list_filter = ["tipo", "ano", "ativo"]
    search_fields = ["titulo", "autor", "orientador", "palavras_chave"]
    ordering = ["-ano", "titulo"]
    prepopulated_fields = {"slug": ("titulo",)}


admin.site.register(ProducaoAcademica, ProducaoAcademicaAdmin)
