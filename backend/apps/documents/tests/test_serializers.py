import pytest
from rest_framework.test import APIClient

from apps.core.constants import DocumentStatus, UserRole
from apps.documents.models import Document
from apps.documents.serializers import (
    DocumentWriteSerializer,
)
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestDocumentSerializers:
    def test_list_serializer_only_public(self, api_client):
        Document.objects.create(titulo="Publicado", status=DocumentStatus.PUBLISHED)
        Document.objects.create(titulo="Rascunho", status=DocumentStatus.DRAFT)

        response = api_client.get("/api/v1/documentos/")
        assert response.status_code == 200
        titulos = [item["titulo"] for item in response.data["results"]]
        assert "Publicado" in titulos
        assert "Rascunho" not in titulos

    def test_cataloguer_sees_own_drafts(self, api_client):
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        Document.objects.create(
            titulo="Rascunho", status=DocumentStatus.DRAFT, created_by=catalogador
        )
        Document.objects.create(titulo="Publicado", status=DocumentStatus.PUBLISHED)

        api_client.force_authenticate(user=catalogador)
        response = api_client.get("/api/v1/documentos/")
        assert response.status_code == 200
        titulos = [item["titulo"] for item in response.data["results"]]
        assert "Rascunho" in titulos
        assert "Publicado" in titulos

    def test_write_serializer_validation(self):
        serializer = DocumentWriteSerializer(data={})
        assert not serializer.is_valid()
        assert "titulo" in serializer.errors

    def test_write_serializer_accepts_valid_data(self):
        serializer = DocumentWriteSerializer(
            data={
                "titulo": "Documento Teste",
                "tipo_documento": "ata",
            }
        )
        assert serializer.is_valid()

    def test_detail_view_returns_full_metadata(self, api_client):
        doc = Document.objects.create(
            titulo="Detalhado",
            status=DocumentStatus.PUBLISHED,
            descricao="Descrição completa",
            resumo="Resumo do documento",
            codigo_referencia="BR-CAVN-001",
            idioma="pt-BR",
            direitos="Domínio público",
        )
        response = api_client.get(f"/api/v1/documentos/{doc.slug}/")
        assert response.status_code == 200
        assert response.data["titulo"] == "Detalhado"
        assert response.data["codigo_referencia"] == "BR-CAVN-001"
        assert response.data["descricao"] == "Descrição completa"

    def test_list_pagination(self, api_client):
        for i in range(25):
            Document.objects.create(titulo=f"Doc {i}", status=DocumentStatus.PUBLISHED)

        response = api_client.get("/api/v1/documentos/")
        assert response.status_code == 200
        assert "count" in response.data
        assert response.data["count"] == 25
        assert len(response.data["results"]) == 20

    def test_filter_by_tipo_documento(self, api_client):
        Document.objects.create(
            titulo="Ata 1", status=DocumentStatus.PUBLISHED, tipo_documento="ata"
        )
        Document.objects.create(
            titulo="Foto 1", status=DocumentStatus.PUBLISHED, tipo_documento="fotografia"
        )

        response = api_client.get("/api/v1/documentos/?tipo=ata")
        assert response.status_code == 200
        titulos = [item["titulo"] for item in response.data["results"]]
        assert "Ata 1" in titulos
        assert "Foto 1" not in titulos
