import pytest
from django.middleware.csrf import _get_new_csrf_string
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.constants import UserRole
from apps.users.models import User
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestUserPermissions:
    def test_admin_can_access_users_list(self, api_client):
        admin = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=admin)
        response = api_client.get("/api/v1/auth/usuarios/")
        assert response.status_code == 200

    def test_cataloguer_cannot_access_users_list(self, api_client):
        user = UserFactory(role=UserRole.CATALOGUER)
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/auth/usuarios/")
        assert response.status_code == 403

    def test_visitor_cannot_access_users_list(self, api_client):
        user = UserFactory(role=UserRole.VISITOR)
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/auth/usuarios/")
        assert response.status_code == 403

    def test_unauthenticated_cannot_list_users(self, api_client):
        response = api_client.get("/api/v1/auth/usuarios/")
        assert response.status_code == 401

    def test_user_can_read_own_profile(self, api_client):
        user = UserFactory(role=UserRole.CATALOGUER)
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == 200
        assert response.data["email"] == user.email

    def test_anonymous_cannot_access_me(self, api_client):
        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == 401

    def test_login_with_valid_credentials(self, api_client):
        user = User.objects.create_user(
            email="admin@teste.br",
            username="admin",
            password="SenhaForte123!",
            role=UserRole.ADMINISTRATOR,
        )
        response = api_client.post(
            "/api/v1/auth/login/",
            {
                "email": "admin@teste.br",
                "password": "SenhaForte123!",
            },
        )
        assert response.status_code == 200
        assert "access" in response.data

    def test_login_with_invalid_password(self, api_client):
        user = User.objects.create_user(
            email="user@teste.br",
            username="user",
            password="SenhaForte123!",
            role=UserRole.VISITOR,
        )
        response = api_client.post(
            "/api/v1/auth/login/",
            {
                "email": "user@teste.br",
                "password": "senha_errada",
            },
        )
        assert response.status_code == 401

    def test_logout_clears_session(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=user)
        api_client.post("/api/v1/auth/logout/")

        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == 200

    def test_cookie_auth_post_requires_csrf_header(self):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        refresh = RefreshToken.for_user(user)
        api_client = APIClient(enforce_csrf_checks=True)
        api_client.cookies["cavn_access"] = str(refresh.access_token)

        response = api_client.post("/api/v1/auth/2fa/setup/")
        assert response.status_code == 403

        csrf_token = _get_new_csrf_string()
        api_client.cookies["csrftoken"] = csrf_token
        response = api_client.post(
            "/api/v1/auth/2fa/setup/",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        assert response.status_code == 200
