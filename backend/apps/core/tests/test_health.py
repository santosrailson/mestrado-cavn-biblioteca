from unittest.mock import patch

import pytest
from django.db import DatabaseError
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestHealthCheck:
    def test_liveness_nao_consulta_dependencias(self, api_client):
        with patch("apps.core.views._dependency_checks") as checks:
            response = api_client.get("/api/v1/health/live/")
        assert response.status_code == 200
        checks.assert_not_called()

    def test_readiness_retorna_503_quando_dependencia_falha(self, api_client):
        with patch("apps.core.views._dependency_checks", return_value={"database": "erro"}):
            response = api_client.get("/api/v1/health/ready/")
        assert response.status_code == 503
        assert response.data["status"] == "erro"

    @override_settings(METRICS_TOKEN="test-metrics-token")
    def test_metricas_exigem_token_e_nao_expoem_query_string(self, api_client):
        api_client.get("/api/v1/health/live/?email=nao-armazenar@example.com")

        without_token = api_client.get("/api/v1/metrics/")
        assert without_token.status_code == 404

        response = api_client.get(
            "/api/v1/metrics/",
            HTTP_X_METRICS_TOKEN="test-metrics-token",
        )
        assert response.status_code == 200
        assert response.data["requests_total"] >= 1
        assert all("email" not in route for route in response.data["routes"])

    def test_saudavel_retorna_200_com_checks_detalhados(self, api_client):
        response = api_client.get("/api/v1/health/")
        assert response.status_code == 200
        assert response.data["status"] == "ok"
        assert response.data["checks"]["database"] == "ok"
        assert response.data["checks"]["cache"] == "ok"

    def test_banco_fora_do_ar_retorna_503(self, api_client):
        with patch(
            "apps.core.views.connections",
        ) as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = DatabaseError(
                "conexão recusada"
            )
            response = api_client.get("/api/v1/health/")
        assert response.status_code == 503
        assert response.data["checks"]["database"] == "erro"

    def test_cache_fora_do_ar_retorna_503(self, api_client):
        with patch("apps.core.views.cache") as mock_cache:
            mock_cache.set.side_effect = ConnectionError("redis indisponível")
            response = api_client.get("/api/v1/health/")
        assert response.status_code == 503
        assert response.data["checks"]["cache"] == "erro"
