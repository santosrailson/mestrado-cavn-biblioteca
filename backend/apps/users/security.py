"""Primitivas de segurança para sessões e tokens da aplicação."""

from django.db.models import F
from rest_framework_simplejwt.tokens import RefreshToken


class CavnRefreshToken(RefreshToken):
    """Refresh token que carrega a versão atual de autenticação do usuário."""

    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token["token_version"] = int(user.auth_token_version)
        return token


def revoke_user_sessions(user) -> int:
    """Revoga imediatamente os access/refresh tokens emitidos para o usuário."""

    updated = (
        type(user).objects.filter(pk=user.pk).update(auth_token_version=F("auth_token_version") + 1)
    )
    if updated:
        user.refresh_from_db(fields=["auth_token_version"])
    return updated
