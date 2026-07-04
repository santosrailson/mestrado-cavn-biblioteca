import pytest
from rest_framework.test import APIClient

from apps.categories.models import Categoria
from apps.categories.tests.factories import CategoriaFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestCategoriaRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post("/api/v1/categorias/", {"nome": "Categoria Nova"})
        assert response.status_code == 403

    def test_cataloguer_can_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post("/api/v1/categorias/", {"nome": "Categoria Nova"})
        assert response.status_code == 201

    def test_visitor_cannot_delete(self, api_client, visitante):
        categoria = CategoriaFactory()
        api_client.force_authenticate(user=visitante)
        response = api_client.delete(f"/api/v1/categorias/{categoria.id}/")
        assert response.status_code == 403
        assert Categoria.objects.filter(pk=categoria.pk).exists()
