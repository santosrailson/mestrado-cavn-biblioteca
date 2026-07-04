import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestRequestIdMiddleware:
    def test_resposta_inclui_header_x_request_id(self, api_client):
        response = api_client.get("/api/v1/health/")
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0

    def test_request_id_enviado_pelo_cliente_e_reaproveitado(self, api_client):
        response = api_client.get(
            "/api/v1/health/", HTTP_X_REQUEST_ID="id-fixo-do-cliente-123"
        )
        assert response.headers["X-Request-ID"] == "id-fixo-do-cliente-123"
