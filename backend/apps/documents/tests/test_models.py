import pytest

from apps.core.constants import DocumentStatus, UserRole
from apps.documents.models import Document
from apps.documents.services import DocumentWorkflowService, WorkflowError
from apps.users.models import User


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
def test_document_slug_and_public(catalogador):
    doc = Document.objects.create(titulo="Ata de Fundação", created_by=catalogador)
    assert doc.slug.startswith("ata-de-fundacao")
    assert not doc.is_public


@pytest.mark.django_db
def test_workflow_transitions(catalogador, curador):
    doc = Document.objects.create(titulo="Doc", created_by=catalogador)
    DocumentWorkflowService.submit(doc, catalogador)
    assert doc.status == DocumentStatus.UNDER_REVIEW
    DocumentWorkflowService.approve(doc, curador)
    assert doc.status == DocumentStatus.APPROVED
    DocumentWorkflowService.publish(doc, curador)
    assert doc.status == DocumentStatus.PUBLISHED
    assert doc.is_public


@pytest.mark.django_db
def test_invalid_workflow_transition_raises(catalogador):
    doc = Document.objects.create(titulo="Doc", created_by=catalogador)
    with pytest.raises(WorkflowError):
        DocumentWorkflowService.publish(doc, catalogador)
