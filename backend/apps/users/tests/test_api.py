import pytest
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_token_obtain_pair(api_client):
    User.objects.create_user(
        email="teste@cavn.br",
        username="teste",
        password="senha123",
        role=UserRole.VISITOR,
    )
    response = api_client.post(
        "/api/v1/auth/token/", {"email": "teste@cavn.br", "password": "senha123"}
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_me_endpoint_requires_auth(api_client):
    response = api_client.get("/api/v1/auth/me/")
    assert response.status_code == 401
