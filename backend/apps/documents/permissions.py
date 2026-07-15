"""Permissões específicas para documentos."""

from rest_framework import permissions

from apps.core.constants import DocumentStatus


class CanReadDocument(permissions.BasePermission):
    """Permite leitura pública apenas de documentos publicados."""

    def has_object_permission(self, request, view, obj):
        if obj.is_public:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.can_catalogue() or request.user == obj.created_by


class CanEditDocument(permissions.BasePermission):
    """Permite edição apenas para catalogadores no próprio rascunho ou moderadores."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_administrator or user.is_curator:
            return True
        if user.is_cataloguer and obj.created_by == user:
            return obj.status in {DocumentStatus.DRAFT, DocumentStatus.REJECTED}
        return False


class CanApproveDocument(permissions.BasePermission):
    """Permite ações de moderação de workflow."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_moderate()

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated or not user.can_moderate():
            return False
        # Segregação de funções: quem catalogou não pode aprovar/publicar o próprio item.
        if getattr(view, "action", None) in {"aprovar", "publicar"}:
            return obj.created_by_id != user.pk
        return True
