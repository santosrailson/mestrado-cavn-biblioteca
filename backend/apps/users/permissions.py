"""Permissões baseadas em perfis do sistema."""

from rest_framework import permissions


class IsAdministrator(permissions.BasePermission):
    """Permite acesso apenas a administradores."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_administrator
        )


class IsCurator(permissions.BasePermission):
    """Permite acesso a curadores e administradores."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_moderate()
        )


class IsCataloguer(permissions.BasePermission):
    """Permite acesso a catalogadores, curadores e administradores."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_catalogue()
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permite edição apenas ao próprio usuário."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj == request.user


class IsAdministratorOrReadOnly(permissions.BasePermission):
    """Permite leitura para qualquer um, mas restringe escrita a administradores."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_administrator
        )


class IsCuratorOrAdminOrReadOnly(permissions.BasePermission):
    """Permite leitura para qualquer um, mas restringe escrita a curadores/administradores."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_moderate()
        )
