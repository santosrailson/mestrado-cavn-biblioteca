"""Configuração do admin para usuários com django-unfold."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin

from apps.users.models import PrivacyRequest, TwoFactorRecoveryCode, User


class UserAdmin(ModelAdmin, BaseUserAdmin):
    """Admin customizado para o modelo User."""

    list_display = [
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "date_joined",
    ]
    list_filter = ["role", "is_active", "is_staff", "date_joined"]
    search_fields = ["email", "first_name", "last_name", "username"]
    ordering = ["-date_joined"]
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        (
            _("Informações pessoais"),
            {"fields": ("first_name", "last_name", "institution", "bio", "avatar")},
        ),
        (
            _("Permissões"),
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            _("Segurança"),
            {"fields": ("auth_token_version",)},
        ),
        (_("Datas importantes"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )


admin.site.register(User, UserAdmin)


@admin.register(PrivacyRequest)
class PrivacyRequestAdmin(ModelAdmin):
    """Administra solicitações LGPD sem permitir apagá-las."""

    list_display = ["tipo", "usuario", "status", "criado_em", "resolvido_em"]
    list_filter = ["tipo", "status", "criado_em"]
    search_fields = ["usuario__email", "usuario__first_name", "usuario__last_name", "descricao"]
    readonly_fields = ["id", "usuario", "tipo", "descricao", "criado_em", "atualizado_em"]
    fields = readonly_fields + [
        "status",
        "resposta",
        "base_legal",
        "responsavel",
        "decisao_motivo",
        "prazo_em",
        "resolvido_em",
        "resolvido_por",
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TwoFactorRecoveryCode)
class TwoFactorRecoveryCodeAdmin(ModelAdmin):
    """Permite auditoria sem exibir o conteúdo dos códigos."""

    list_display = ["usuario", "criado_em", "usado_em"]
    list_filter = ["usado_em", "criado_em"]
    search_fields = ["usuario__email"]
    readonly_fields = ["id", "usuario", "codigo_hash", "criado_em", "usado_em"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
