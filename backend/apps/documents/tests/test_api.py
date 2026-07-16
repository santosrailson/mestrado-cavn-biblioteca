import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

from apps.core.constants import DocumentStatus, UserRole
from apps.documents.models import Arquivo, Document
from apps.users.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def catalogador(db):
    return User.objects.create_user(
        email="catalogador@cavn.br",
        username="catalogador",
        password="testpass",
        role=UserRole.CATALOGUER,
    )


@pytest.fixture
def curador(db):
    return User.objects.create_user(
        email="curador@cavn.br",
        username="curador",
        password="testpass",
        role=UserRole.CURATOR,
    )


@pytest.mark.django_db
def test_public_documents_list_only_published(api_client):
    Document.objects.create(titulo="Publicado", status=DocumentStatus.PUBLISHED)
    Document.objects.create(titulo="Rascunho", status=DocumentStatus.DRAFT)

    response = api_client.get("/api/v1/documentos/")
    assert response.status_code == 200
    titulos = [item["titulo"] for item in response.data["results"]]
    assert "Publicado" in titulos
    assert "Rascunho" not in titulos


@pytest.mark.django_db
def test_search_endpoint(api_client):
    Document.objects.create(titulo="Fundação do CAVN", status=DocumentStatus.PUBLISHED)
    response = api_client.get("/api/v1/documentos/busca/?q=Fundação")
    assert response.status_code == 200
    assert any(item["titulo"] == "Fundação do CAVN" for item in response.data["results"])


@pytest.mark.django_db
def test_document_workflow_actions(api_client, catalogador, curador):
    doc = Document.objects.create(
        titulo="Workflow", status=DocumentStatus.DRAFT, created_by=catalogador
    )
    api_client.force_authenticate(user=catalogador)

    response = api_client.post(f"/api/v1/documentos/{doc.slug}/submeter/")
    assert response.status_code == 200

    api_client.force_authenticate(user=curador)
    response = api_client.post(f"/api/v1/documentos/{doc.slug}/aprovar/")
    assert response.status_code == 200

    response = api_client.post(f"/api/v1/documentos/{doc.slug}/publicar/")
    assert response.status_code == 200

    doc.refresh_from_db()
    assert doc.status == DocumentStatus.PUBLISHED


@pytest.mark.django_db
@override_settings(USE_X_ACCEL_REDIRECT=True)
def test_download_usa_caminho_interno_e_nao_expoe_storage(api_client):
    doc = Document.objects.create(titulo="Documento protegido", status=DocumentStatus.PUBLISHED)
    arquivo = Arquivo.objects.create(
        documento=doc,
        nome_original="arquivo.txt",
        nome_armazenado="arquivo.txt",
        arquivo=SimpleUploadedFile("arquivo.txt", b"conteudo", content_type="text/plain"),
        mime_type="text/plain",
    )

    response = api_client.get(f"/api/v1/documentos/arquivos/{arquivo.pk}/download/")

    assert response.status_code == 200
    assert response["X-Accel-Redirect"].startswith("/media-protected/documentos/")
    assert "/media/" not in response["X-Accel-Redirect"]
