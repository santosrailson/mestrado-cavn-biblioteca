"""ViewSets e views de autenticação para usuários."""

from axes.handlers.proxy import AxesProxyHandler
from axes.helpers import (
    get_client_ip_address,
    get_client_user_agent,
)
from django.conf import settings
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.audit.services import AuditoriaService
from apps.documents.models import Document
from apps.users.models import PrivacyRequest, User
from apps.users.permissions import IsAdministrator, IsOwnerOrAdministrator
from apps.users.ratelimit import RateLimitedMixin, drf_ratelimit
from apps.users.serializers import (
    PrivacyRequestSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

_COOKIE_SECURE = getattr(settings, "SESSION_COOKIE_SECURE", False)
_AXES_ENABLED = "axes" in settings.INSTALLED_APPS and not getattr(settings, "TESTING", False)


def _set_auth_cookies(response, access_token, refresh_token=None):
    """Define os cookies httpOnly de autenticação na resposta."""
    response.set_cookie(
        "cavn_access",
        access_token,
        max_age=3600,  # 1h — alinhado com SIMPLE_JWT ACCESS_TOKEN_LIFETIME
        httponly=True,
        samesite="Lax",
        secure=_COOKIE_SECURE,
    )
    if refresh_token:
        response.set_cookie(
            "cavn_refresh",
            refresh_token,
            max_age=7 * 24 * 3600,
            httponly=True,
            samesite="Lax",
            secure=_COOKIE_SECURE,
        )


def _ensure_csrf_cookie(request):
    """Garante emissão/renovação do cookie csrftoken para o frontend."""
    get_token(request)


def _clear_auth_cookies(response):
    """Remove os cookies de autenticação da resposta."""
    response.delete_cookie("cavn_access", samesite="Lax")
    response.delete_cookie("cavn_refresh", samesite="Lax")


class CustomTokenObtainPairView(RateLimitedMixin, TokenObtainPairView):
    """Login via JWT: define cookies httpOnly e retorna dados do usuário.

    Integra com django-axes para bloqueio temporário após tentativas falhas.
    """

    permission_classes = [AllowAny]
    rate_limit_group = "login"
    rate_limit_rate = "5/m"

    def _axes_credentials(self, request):
        """Monta credenciais usadas pelo django-axes."""
        email = request.data.get("email", "")
        return {
            "username": email,
            "ip_address": get_client_ip_address(request),
            "user_agent": get_client_user_agent(request),
        }

    def post(self, request, *args, **kwargs):
        credentials = self._axes_credentials(request)
        handler = AxesProxyHandler()

        if _AXES_ENABLED and handler.is_locked(request, credentials=credentials):
            return Response(
                {
                    "detail": (
                        "Conta temporariamente bloqueada devido a muitas "
                        "tentativas de login. Tente novamente mais tarde."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        response = super().post(request, *args, **kwargs)
        success = response.status_code == status.HTTP_200_OK

        if _AXES_ENABLED:
            if success:
                user = User.objects.filter(email=request.data.get("email")).first()
                if user:
                    handler.user_logged_in(None, request, user)
            else:
                handler.user_login_failed(None, credentials, request)

        if success:
            user = User.objects.filter(email=request.data.get("email")).first()
            # 2FA obrigatório para qualquer usuário privilegiado (catalogador, curador, admin)
            # que já tenha um dispositivo 2FA configurado.
            if user and user.can_catalogue():
                has_2fa = TOTPDevice.objects.filter(user=user, confirmed=True).exists()
                if has_2fa:
                    response.data["twofactor_required"] = True
                    response.data["user_id"] = str(user.pk)
                    # Não emite tokens JWT — o frontend precisa do token 2FA primeiro
                    return Response(
                        {
                            "twofactor_required": True,
                            "user_id": str(user.pk),
                            "email": user.email,
                        },
                        status=status.HTTP_200_OK,
                    )

            _set_auth_cookies(
                response,
                access_token=response.data.get("access"),
                refresh_token=response.data.get("refresh"),
            )
            _ensure_csrf_cookie(request)
            if user:
                response.data["usuario"] = UserSerializer(user).data
                AuditoriaService.registrar(
                    usuario=user,
                    acao="login",
                    entidade="User",
                    entidade_id=str(user.pk),
                    request=request,
                )
        return response


class CustomTokenRefreshView(RateLimitedMixin, TokenRefreshView):
    """Renova o access token lendo o refresh do cookie httpOnly."""

    permission_classes = [AllowAny]
    rate_limit_group = "token_refresh"
    rate_limit_rate = "10/m"

    def post(self, request, *args, **kwargs):
        refresh_cookie = request.COOKIES.get("cavn_refresh")
        if not refresh_cookie:
            return Response(
                {"detail": "Cookie de refresh não encontrado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Injeta o valor do cookie no request.data para o serializer do simplejwt
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        data["refresh"] = refresh_cookie

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        response = Response(serializer.validated_data)
        _set_auth_cookies(
            response,
            access_token=serializer.validated_data["access"],
            refresh_token=serializer.validated_data.get("refresh"),
        )
        _ensure_csrf_cookie(request)
        return response


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    """Logout: adiciona o refresh token à blacklist e limpa os cookies."""
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh_token = request.COOKIES.get("cavn_refresh")
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

    if request.user and request.user.is_authenticated:
        AuditoriaService.registrar(
            usuario=request.user,
            acao="logout",
            entidade="User",
            entidade_id=str(request.user.pk),
            request=request,
        )

    response = Response({"sucesso": True, "mensagem": "Logout realizado com sucesso."})
    _clear_auth_cookies(response)
    return response


class UserViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """ViewSet para CRUD de usuários (administradores podem gerenciar todos)."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ["list", "destroy", "create"]:
            return [IsAdministrator()]
        if self.action in ["retrieve", "update", "partial_update"]:
            return [IsAuthenticated(), IsOwnerOrAdministrator()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer


class UserCreateView(generics.CreateAPIView):
    """Endpoint público para cadastro de visitantes."""

    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        from apps.core.constants import UserRole

        serializer.save(role=UserRole.VISITOR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Retorna os dados do usuário autenticado."""
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class PrivacyRequestListCreateView(generics.ListCreateAPIView):
    """Lista as solicitações do titular e recebe novas solicitações de direito."""

    serializer_class = PrivacyRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PrivacyRequest.objects.select_related("usuario")
        if self.request.user.is_administrator:
            return queryset
        return queryset.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        request = serializer.save(usuario=self.request.user)
        AuditoriaService.registrar(
            usuario=self.request.user,
            acao="criar",
            entidade="PrivacyRequest",
            entidade_id=request.pk,
            dados_novos={"tipo": request.tipo},
            request=self.request,
        )


class PrivacyRequestDetailView(generics.RetrieveUpdateAPIView):
    """Permite ao titular consultar e ao administrador resolver a solicitação."""

    serializer_class = PrivacyRequestSerializer
    permission_classes = [IsAuthenticated]
    queryset = PrivacyRequest.objects.select_related("usuario")
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_administrator:
            return queryset
        return queryset.filter(usuario=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_administrator:
            return Response(
                {"detail": "Apenas administradores podem atualizar uma solicitação."}, status=403
            )
        instance = self.get_object()
        allowed = {key: request.data[key] for key in ("status", "resposta") if key in request.data}
        if not allowed:
            return Response({"detail": "Informe status ou resposta."}, status=400)
        if "status" in allowed and allowed["status"] not in PrivacyRequest.Status.values:
            return Response({"detail": "Status de solicitação inválido."}, status=400)
        if "status" in allowed:
            instance.status = allowed["status"]
        if "resposta" in allowed:
            instance.resposta = str(allowed["resposta"])[:4000]
        if instance.status in {PrivacyRequest.Status.COMPLETED, PrivacyRequest.Status.REJECTED}:
            instance.resolvido_por = request.user
            instance.resolvido_em = timezone.now()
        else:
            instance.resolvido_por = None
            instance.resolvido_em = None
        instance.save(
            update_fields=["status", "resposta", "resolvido_por", "resolvido_em", "atualizado_em"]
        )
        AuditoriaService.registrar(
            usuario=request.user,
            acao="atualizar",
            entidade="PrivacyRequest",
            entidade_id=instance.pk,
            dados_novos=allowed,
            request=request,
        )
        return Response(self.get_serializer(instance).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def privacy_export_view(request):
    """Entrega uma cópia JSON dos dados da conta sob solicitação do titular."""

    user = request.user
    documents = list(
        Document.objects.filter(created_by=user, deleted_at__isnull=True).values(
            "id", "titulo", "slug", "tipo_documento", "created_at", "updated_at"
        )
    )
    payload = {
        "exported_at": timezone.now().isoformat(),
        "purpose": "Exercício do direito de acesso do titular.",
        "profile": {
            "id": str(user.pk),
            "email": user.email,
            "username": user.username,
            "name": user.get_full_name(),
            "role": user.role,
            "institution": user.institution,
            "bio": user.bio,
            "created_at": user.date_joined.isoformat() if user.date_joined else None,
        },
        "documents_created_by_account": documents,
        "privacy_requests": list(
            PrivacyRequest.objects.filter(usuario=user).values(
                "id", "tipo", "descricao", "status", "resposta", "criado_em", "atualizado_em"
            )
        ),
    }
    AuditoriaService.registrar(
        usuario=user, acao="criar", entidade="PrivacyExport", entidade_id=user.pk, request=request
    )
    response = JsonResponse(payload, json_dumps_params={"ensure_ascii": False})
    response["Content-Disposition"] = 'attachment; filename="cavn-dados-pessoais.json"'
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="alterar_senha", rate="5/m")
def alterar_propria_senha(request):
    """Usuário autenticado altera a própria senha (requer senha atual)."""
    user = request.user
    senha_atual = request.data.get("senha_atual", "")
    nova_senha = request.data.get("nova_senha", "")

    if not nova_senha or len(nova_senha) < 8:
        return Response(
            {"detail": "A nova senha deve ter pelo menos 8 caracteres."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not user.check_password(senha_atual):
        return Response(
            {"detail": "Senha atual incorreta."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user.set_password(nova_senha)
    user.save()
    return Response({"sucesso": True, "mensagem": "Senha alterada com sucesso."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="solicitar_senha", rate="3/h")
def solicitar_alteracao_senha(request):
    """Usuário não-admin envia solicitação de troca de senha para aprovação."""
    from django.contrib.auth.hashers import make_password

    from apps.users.models import SolicitacaoAlteracaoSenha

    user = request.user
    if user.can_administer():
        return Response(
            {"detail": "Administradores podem alterar a senha diretamente."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    nova_senha = request.data.get("nova_senha", "")
    if not nova_senha or len(nova_senha) < 8:
        return Response(
            {"detail": "A nova senha deve ter pelo menos 8 caracteres."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Substitui solicitação pendente anterior (uma por usuário)
    SolicitacaoAlteracaoSenha.objects.filter(usuario=user, status="pendente").delete()
    SolicitacaoAlteracaoSenha.objects.create(
        usuario=user,
        senha_hash=make_password(nova_senha),
    )
    return Response(
        {"sucesso": True, "mensagem": "Solicitação enviada. Aguarde aprovação do administrador."}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def status_solicitacao_senha(request):
    """Retorna o status da solicitação de senha mais recente do usuário atual."""
    from apps.users.models import SolicitacaoAlteracaoSenha

    sol = (
        SolicitacaoAlteracaoSenha.objects.filter(usuario=request.user)
        .order_by("-criado_em")
        .first()
    )

    if not sol:
        return Response({"status": None})
    return Response({"status": sol.status, "criado_em": sol.criado_em.isoformat()})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def listar_solicitacoes_senha(request):
    """Admin lista todas as solicitações de senha pendentes."""
    from apps.users.models import SolicitacaoAlteracaoSenha

    if not request.user.can_administer():
        return Response(status=status.HTTP_403_FORBIDDEN)

    solicitacoes = (
        SolicitacaoAlteracaoSenha.objects.filter(status="pendente")
        .select_related("usuario")
        .order_by("-criado_em")
    )
    data = [
        {
            "id": str(s.pk),
            "usuario_id": str(s.usuario.pk),
            "usuario_nome": s.usuario.get_full_name() or s.usuario.email,
            "usuario_email": s.usuario.email,
            "usuario_perfil": s.usuario.role,
            "criado_em": s.criado_em.isoformat(),
        }
        for s in solicitacoes
    ]
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def aprovar_solicitacao_senha(request, pk):
    """Admin aprova uma solicitação e aplica a nova senha."""
    from django.shortcuts import get_object_or_404
    from django.utils.timezone import now

    from apps.users.models import SolicitacaoAlteracaoSenha

    if not request.user.can_administer():
        return Response(status=status.HTTP_403_FORBIDDEN)

    sol = get_object_or_404(SolicitacaoAlteracaoSenha, pk=pk, status="pendente")
    sol.usuario.password = sol.senha_hash
    sol.usuario.save(update_fields=["password"])

    sol.status = "aprovada"
    sol.resolvido_em = now()
    sol.resolvido_por = request.user
    sol.save()
    return Response({"sucesso": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rejeitar_solicitacao_senha(request, pk):
    """Admin rejeita uma solicitação de troca de senha."""
    from django.shortcuts import get_object_or_404
    from django.utils.timezone import now

    from apps.users.models import SolicitacaoAlteracaoSenha

    if not request.user.can_administer():
        return Response(status=status.HTTP_403_FORBIDDEN)

    sol = get_object_or_404(SolicitacaoAlteracaoSenha, pk=pk, status="pendente")
    sol.status = "rejeitada"
    sol.resolvido_em = now()
    sol.resolvido_por = request.user
    sol.save()
    return Response({"sucesso": True})
