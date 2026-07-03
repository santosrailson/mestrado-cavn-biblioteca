"""Rotas de autenticação e usuários."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.users import twofactor, views

router = DefaultRouter()
router.register(r"usuarios", views.UserViewSet, basename="usuarios")

urlpatterns = [
    path("login/", views.CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path(
        "token/",
        views.CustomTokenObtainPairView.as_view(),
        name="token_obtain_pair_legacy",
    ),
    path("refresh/", views.CustomTokenRefreshView.as_view(), name="token_refresh"),
    path(
        "token/refresh/",
        views.CustomTokenRefreshView.as_view(),
        name="token_refresh_legacy",
    ),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.me_view, name="me"),
    path("cadastro/", views.UserCreateView.as_view(), name="user_create"),
    # Senhas
    path("alterar-senha/", views.alterar_propria_senha, name="alterar_senha"),
    path("solicitar-senha/", views.solicitar_alteracao_senha, name="solicitar_senha"),
    path("status-senha/", views.status_solicitacao_senha, name="status_senha"),
    path("solicitacoes-senha/", views.listar_solicitacoes_senha, name="listar_solicitacoes_senha"),
    path("solicitacoes-senha/<int:pk>/aprovar/", views.aprovar_solicitacao_senha, name="aprovar_senha"),
    path("solicitacoes-senha/<int:pk>/rejeitar/", views.rejeitar_solicitacao_senha, name="rejeitar_senha"),
    # 2FA
    path("2fa/status/", twofactor.twofactor_status, name="twofactor_status"),
    path("2fa/setup/", twofactor.twofactor_setup, name="twofactor_setup"),
    path("2fa/verify-setup/", twofactor.twofactor_verify_setup, name="twofactor_verify_setup"),
    path("2fa/disable/", twofactor.twofactor_disable, name="twofactor_disable"),
    path("2fa/login/", twofactor.twofactor_login, name="twofactor_login"),
]
urlpatterns += router.urls
