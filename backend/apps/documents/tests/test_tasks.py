from unittest.mock import patch

import pytest
from django.core.files.base import ContentFile

from apps.core.middleware import request_id_var
from apps.documents.models import Arquivo
from apps.documents.tasks import processar_arquivo_async
from apps.documents.tests.factories import DocumentFactory


@pytest.fixture
def arquivo(db):
    documento = DocumentFactory()
    return Arquivo.objects.create(
        documento=documento,
        arquivo=ContentFile(b"conteudo de teste", name="teste.txt"),
        tipo_arquivo="original",
    )


@pytest.mark.django_db
class TestProcessarArquivoAsync:
    def test_task_usa_request_id_do_cabecalho(self, arquivo):
        captured = {}

        def fake_process(file):
            captured["request_id"] = request_id_var.get()
            captured["arquivo_id"] = str(file.pk)

        with patch("apps.documents.tasks.process_uploaded_file", side_effect=fake_process):
            result = processar_arquivo_async.apply(
                args=[str(arquivo.pk)],
                headers={"x-request-id": "req-abc-123"},
            )

        assert result.successful()
        assert result.result["status"] == "ok"
        assert result.result["arquivo_id"] == str(arquivo.pk)
        assert captured["request_id"] == "req-abc-123"
        assert captured["arquivo_id"] == str(arquivo.pk)
        assert request_id_var.get() == ""

    def test_task_aceita_request_id_via_kwarg_legado(self, arquivo):
        captured = {}

        def fake_process(_file):
            captured["request_id"] = request_id_var.get()

        with patch("apps.documents.tasks.process_uploaded_file", side_effect=fake_process):
            result = processar_arquivo_async.apply(
                args=[str(arquivo.pk)],
                kwargs={"request_id": "legacy-123"},
            )

        assert result.successful()
        assert captured["request_id"] == "legacy-123"
        assert request_id_var.get() == ""

    def test_cabecalho_tem_precedencia_sobre_kwarg(self, arquivo):
        captured = {}

        def fake_process(_file):
            captured["request_id"] = request_id_var.get()

        with patch("apps.documents.tasks.process_uploaded_file", side_effect=fake_process):
            result = processar_arquivo_async.apply(
                args=[str(arquivo.pk)],
                kwargs={"request_id": "legacy-123"},
                headers={"x-request-id": "header-123"},
            )

        assert result.successful()
        assert captured["request_id"] == "header-123"
        assert request_id_var.get() == ""

    def test_sem_request_id_nao_altera_context_var(self, arquivo):
        request_id_var.set("pre-existente")

        with patch("apps.documents.tasks.process_uploaded_file"):
            result = processar_arquivo_async.apply(args=[str(arquivo.pk)])

        assert result.successful()
        assert request_id_var.get() == "pre-existente"
