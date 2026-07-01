import pytest
from rest_framework.test import APIClient

from apps.core.constants import DocumentStatus, UserRole
from apps.documents.models import Document
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestDocumentPermissions:
    def test_unauthenticated_cannot_create(self, api_client):
        response = api_client.post("/api/v1/documentos/", {"titulo": "Novo"})
        assert response.status_code == 401

    def test_visitor_cannot_create(self, api_client):
        visitor = UserFactory(role=UserRole.VISITOR)
        api_client.force_authenticate(user=visitor)
        response = api_client.post("/api/v1/documentos/", {"titulo": "Novo"})
        assert response.status_code == 403

    def test_cataloguer_can_create(self, api_client):
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        api_client.force_authenticate(user=catalogador)
        response = api_client.post("/api/v1/documentos/", {
            "titulo": "Novo Documento",
            "tipo_documento": "ata",
        })
        assert response.status_code == 201

    def test_cataloguer_can_edit_own_draft(self, api_client):
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Meu Rascunho",
            status=DocumentStatus.DRAFT,
            created_by=catalogador,
        )
        api_client.force_authenticate(user=catalogador)
        response = api_client.patch(f"/api/v1/documentos/{doc.slug}/", {"titulo": "Editado"})
        assert response.status_code == 200

    def test_cataloguer_cannot_edit_others_draft(self, api_client):
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        outro = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Rascunho Alheio",
            status=DocumentStatus.DRAFT,
            created_by=outro,
        )
        api_client.force_authenticate(user=catalogador)
        response = api_client.patch(f"/api/v1/documentos/{doc.slug}/", {"titulo": "Editado"})
        assert response.status_code == 403

    def test_curator_can_edit_any_document(self, api_client):
        curador = UserFactory(role=UserRole.CURATOR)
        outro = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Qualquer Doc",
            status=DocumentStatus.DRAFT,
            created_by=outro,
        )
        api_client.force_authenticate(user=curador)
        response = api_client.patch(f"/api/v1/documentos/{doc.slug}/", {"titulo": "Curador Editou"})
        assert response.status_code == 200

    def test_cataloguer_can_submit_for_review(self, api_client):
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Submeter", status=DocumentStatus.DRAFT, created_by=catalogador
        )
        api_client.force_authenticate(user=catalogador)
        response = api_client.post(f"/api/v1/documentos/{doc.slug}/submeter/")
        assert response.status_code == 200
        doc.refresh_from_db()
        assert doc.status == DocumentStatus.UNDER_REVIEW

    def test_visitor_cannot_submit(self, api_client):
        visitor = UserFactory(role=UserRole.VISITOR)
        doc = Document.objects.create(
            titulo="Inacessível",
            status=DocumentStatus.DRAFT,
            created_by=visitor,
        )
        api_client.force_authenticate(user=visitor)
        response = api_client.post(f"/api/v1/documentos/{doc.slug}/submeter/")
        # Visitantes não enxergam rascunhos na queryset → 404
        assert response.status_code == 404

    def test_cataloguer_cannot_approve(self, api_client):
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Sem Aprovação",
            status=DocumentStatus.UNDER_REVIEW,
        )
        api_client.force_authenticate(user=catalogador)
        response = api_client.post(f"/api/v1/documentos/{doc.slug}/aprovar/")
        assert response.status_code == 403

    def test_curator_can_approve_and_publish(self, api_client):
        curador = UserFactory(role=UserRole.CURATOR)
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Aprovação Total",
            status=DocumentStatus.UNDER_REVIEW,
            created_by=catalogador,
        )
        api_client.force_authenticate(user=curador)
        response = api_client.post(f"/api/v1/documentos/{doc.slug}/aprovar/")
        assert response.status_code == 200
        doc.refresh_from_db()
        assert doc.status == DocumentStatus.APPROVED

        response = api_client.post(f"/api/v1/documentos/{doc.slug}/publicar/")
        assert response.status_code == 200
        doc.refresh_from_db()
        assert doc.status == DocumentStatus.PUBLISHED

    def test_rejected_document_goes_to_draft_first(self, api_client):
        curador = UserFactory(role=UserRole.CURATOR)
        catalogador = UserFactory(role=UserRole.CATALOGUER)
        doc = Document.objects.create(
            titulo="Rejeitado",
            status=DocumentStatus.REJECTED,
            created_by=catalogador,
            motivo_rejeicao="Ajustar metadados",
        )
        # Rejeitado → Rascunho é válido, e depois rascunho → em_revisao
        from apps.documents.services import DocumentWorkflowService, WorkflowError

        api_client.force_authenticate(user=catalogador)
        response = api_client.post(f"/api/v1/documentos/{doc.slug}/submeter/")
        # REJECTED -> UNDER_REVIEW não é transição válida
        assert response.status_code == 400

    def test_published_document_visible_to_all(self, api_client):
        doc = Document.objects.create(
            titulo="Público", status=DocumentStatus.PUBLISHED
        )
        response = api_client.get(f"/api/v1/documentos/{doc.slug}/")
        assert response.status_code == 200

    def test_draft_document_not_visible_to_anonymous(self, api_client):
        doc = Document.objects.create(titulo="Oculto", status=DocumentStatus.DRAFT)
        response = api_client.get(f"/api/v1/documentos/{doc.slug}/")
        assert response.status_code == 404
