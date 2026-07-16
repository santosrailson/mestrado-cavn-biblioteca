import pytest
from django.core.cache import cache, caches
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.models import User
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_cache():
    """Limpa o cache antes de cada teste para não acumular requisições."""
    cache.clear()
    caches["axes"].clear()


@pytest.mark.django_db
def test_login_rate_limit_returns_429_after_excess(api_client):
    User.objects.create_user(
        email="teste@cavn.br",
        username="teste",
        password="senha123",
        role=UserRole.VISITOR,
    )
    url = "/api/v1/auth/login/"
    payload = {"email": "teste@cavn.br", "password": "errada"}

    for _ in range(5):
        response = api_client.post(url, payload)
        assert response.status_code == 401

    response = api_client.post(url, payload)
    assert response.status_code == 429
    assert "Muitas tentativas" in response.data["detail"]


@pytest.mark.django_db
def test_twofactor_login_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.ADMINISTRATOR)
    url = "/api/v1/auth/2fa/login/"
    payload = {"twofactor_challenge": "invalid", "token": "000000"}

    for _ in range(5):
        response = api_client.post(url, payload)
        assert response.status_code == 401

    response = api_client.post(url, payload)
    assert response.status_code == 429


@pytest.mark.django_db
def test_twofactor_setup_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.ADMINISTRATOR)
    api_client.force_authenticate(user=user)
    url = "/api/v1/auth/2fa/setup/"

    for _ in range(5):
        response = api_client.post(url)
        assert response.status_code == 200

    response = api_client.post(url)
    assert response.status_code == 429


@pytest.mark.django_db
def test_twofactor_verify_setup_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.ADMINISTRATOR)
    api_client.force_authenticate(user=user)
    api_client.post("/api/v1/auth/2fa/setup/")

    url = "/api/v1/auth/2fa/verify-setup/"
    payload = {"token": "000000"}

    for _ in range(5):
        response = api_client.post(url, payload)
        assert response.status_code == 400

    response = api_client.post(url, payload)
    assert response.status_code == 429


@pytest.mark.django_db
def test_solicitar_alteracao_senha_rate_limit_returns_429(api_client):
    user = UserFactory(role=UserRole.CATALOGUER)
    api_client.force_authenticate(user=user)
    url = "/api/v1/auth/solicitar-senha/"
    payload = {"nova_senha": "NovaSenhaForte123"}

    for _ in range(3):
        response = api_client.post(url, payload)
        assert response.status_code == 200

    response = api_client.post(url, payload)
    assert response.status_code == 429
