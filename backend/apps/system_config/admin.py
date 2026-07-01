"""Admin de configurações com django-unfold."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.system_config.models import Configuracao


class ConfiguracaoAdmin(ModelAdmin):
    """Admin para configurações do sistema."""

    list_display = ["chave", "tipo", "descricao", "created_at"]
    search_fields = ["chave", "descricao"]
    list_filter = ["tipo"]


admin.site.register(Configuracao, ConfiguracaoAdmin)
