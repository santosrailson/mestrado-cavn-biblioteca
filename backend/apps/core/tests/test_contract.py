import pytest
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.models import User


@pytest.mark.django_db
def test_openapi_expoe_rotas_criticas_da_api():
    admin = User.objects.create_user(
        email="schema-admin@cavn.br",
        username="schema-admin",
        password="testpass",
        role=UserRole.ADMINISTRATOR,
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user=admin)

    response = client.get("/api/v1/schema/")

    assert response.status_code == 200
    paths = response.data["paths"]
    for path in (
        "/api/v1/health/live/",
        "/api/v1/auth/login/",
        "/api/v1/auth/privacy/requests/",
        "/api/v1/documentos/",
        "/api/v1/documentos/arquivos/{id}/download/",
    ):
        assert path in paths
