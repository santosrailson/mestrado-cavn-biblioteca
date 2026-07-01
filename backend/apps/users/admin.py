"""Configuração do admin para usuários com django-unfold."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin

from apps.users.models import User


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
