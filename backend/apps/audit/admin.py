"""Admin de auditoria com django-unfold."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.audit.models import Auditoria


class AuditoriaAdmin(ModelAdmin):
    """Admin somente leitura para auditoria."""

    list_display = [
        "acao",
        "entidade",
        "entidade_id",
        "usuario",
        "ip_address",
        "created_at",
    ]
    list_filter = ["acao", "entidade", "created_at"]
    search_fields = ["entidade", "entidade_id", "usuario__email"]
    readonly_fields = [field.name for field in Auditoria._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(Auditoria, AuditoriaAdmin)
