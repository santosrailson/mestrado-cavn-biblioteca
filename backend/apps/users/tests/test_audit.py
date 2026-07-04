import pytest
from rest_framework.test import APIClient

from apps.audit.models import Auditoria
from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestAuthAudit:
    def test_login_bem_sucedido_gera_registro_de_auditoria(self, api_client):
        user = UserFactory(role=UserRole.CURATOR)
        user.set_password("senha-forte-123")
        user.save()

        response = api_client.post(
            "/api/v1/auth/login/", {"email": user.email, "password": "senha-forte-123"}
        )

        assert response.status_code == 200
        assert Auditoria.objects.filter(usuario=user, acao="login").exists()

    def test_logout_gera_registro_de_auditoria(self, api_client):
        user = UserFactory(role=UserRole.CURATOR)
        api_client.force_authenticate(user=user)

        response = api_client.post("/api/v1/auth/logout/")

        assert response.status_code == 200
        assert Auditoria.objects.filter(usuario=user, acao="logout").exists()


@pytest.mark.django_db
class TestUserModelAudit:
    def test_criar_usuario_gera_auditoria(self):
        user = UserFactory(role=UserRole.CATALOGUER)
        assert Auditoria.objects.filter(
            entidade="User", entidade_id=str(user.pk), acao="criar"
        ).exists()

    def test_excluir_usuario_gera_auditoria(self):
        user = UserFactory(role=UserRole.CATALOGUER)
        user_id = str(user.pk)
        user.delete()
        assert Auditoria.objects.filter(
            entidade="User", entidade_id=user_id, acao="excluir"
        ).exists()
