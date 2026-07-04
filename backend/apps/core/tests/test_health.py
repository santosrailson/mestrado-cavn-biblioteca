from unittest.mock import patch

import pytest
from django.db import DatabaseError
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestHealthCheck:
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
