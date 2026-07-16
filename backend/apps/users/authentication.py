"""Autenticação JWT via cookie httpOnly ou header Authorization."""

from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework.permissions import SAFE_METHODS
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


def _dummy_get_response(request):
    return None


class JWTCookieAuthentication(JWTAuthentication):
    """Autentica via cookie 'cavn_access' (httpOnly) ou header Authorization Bearer.

    Verifica o header primeiro para compatibilidade com clientes não-browser (ex: curl, swagger).
    Para o cookie: token inválido/expirado retorna None (usuário anônimo) em vez de 401,
    permitindo que endpoints públicos de leitura funcionem sem atraso de refresh.
    Endpoints protegidos de escrita retornam 401 via PermissionDenied, acionando o refresh.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token

        raw_token = request.COOKIES.get("cavn_access")
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token.encode())
            if request.method not in SAFE_METHODS:
                self.enforce_csrf(request)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError):
            # Token expirado ou inválido: trata como anônimo para não bloquear leituras públicas.
            # Requisições de escrita receberão 401 via verificação de permissão,
            # o que aciona o refresh de token no frontend.
            return None

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        token_version = validated_token.get("token_version")
        if token_version is None and getattr(settings, "REQUIRE_TOKEN_VERSION", False):
            raise exceptions.AuthenticationFailed("Token precisa ser renovado.")
        if token_version is not None:
            try:
                is_current = int(token_version) == int(user.auth_token_version)
            except (TypeError, ValueError):
                is_current = False
            if not is_current:
                raise exceptions.AuthenticationFailed("Sessão revogada.")
        return user

    def enforce_csrf(self, request):
        """Exige CSRF para autenticação via cookie.

        Clientes API que usam Authorization: Bearer continuam sem CSRF, mas browsers
        autenticados por cookie precisam provar origem por meio do token CSRF.
        """
        check = CSRFCheck(_dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")
