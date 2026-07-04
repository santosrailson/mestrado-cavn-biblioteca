import pytest
from rest_framework.test import APIClient

from apps.tags.models import Tag
from apps.tags.tests.factories import TagFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestTagRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post("/api/v1/tags/", {"nome": "tag-nova"})
        assert response.status_code == 403

    def test_cataloguer_can_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post("/api/v1/tags/", {"nome": "tag-nova"})
        assert response.status_code == 201

    def test_visitor_cannot_delete(self, api_client, visitante):
        tag = TagFactory()
        api_client.force_authenticate(user=visitante)
        response = api_client.delete(f"/api/v1/tags/{tag.id}/")
        assert response.status_code == 403
        assert Tag.objects.filter(pk=tag.pk).exists()
