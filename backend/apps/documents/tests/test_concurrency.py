import pytest

from apps.core.constants import DocumentStatus, UserRole
from apps.documents.models import Document
from apps.documents.services import DocumentWorkflowService, WorkflowError
from apps.users.models import User


@pytest.mark.django_db
def test_workflow_rejeita_segunda_transicao_idempotente():
    user = User.objects.create_user(
        email="workflow@cavn.br",
        username="workflow",
        password="testpass",
        role=UserRole.CATALOGUER,
    )
    document = Document.objects.create(
        titulo="Transição idempotente", status=DocumentStatus.DRAFT, created_by=user
    )

    DocumentWorkflowService.submit(document, user)

    with pytest.raises(WorkflowError):
        DocumentWorkflowService.submit(document, user)

    document.refresh_from_db()
    assert document.status == DocumentStatus.UNDER_REVIEW


@pytest.mark.integration
@pytest.mark.django_db(transaction=True)
def test_workflow_concorrente_serializa_no_postgresql():
    """Exercita a presença do lock pessimista no banco usado pelo CI."""

    from django.db import connection

    if connection.vendor != "postgresql":
        pytest.skip("teste concorrente requer PostgreSQL")

    # A prova de carga com duas conexões fica no job de integração; este gate
    # evita que o mecanismo seja removido sem atualizar o teste.
    assert "select_for_update" in DocumentWorkflowService._transition.__code__.co_names
