from unittest.mock import patch

import pytest
from celery.exceptions import Retry
from django.core.files.base import ContentFile

from apps.core.middleware import request_id_var
from apps.documents.models import Arquivo
from apps.documents.tasks import processar_arquivo_async
from apps.documents.tests.factories import DocumentFactory


@pytest.fixture(autouse=True)
def reset_request_id_var():
    """Garante isolamento do ContextVar entre testes deste módulo."""
    token = request_id_var.set("")
    yield
    request_id_var.reset(token)


@pytest.fixture
def arquivo(db):
    documento = DocumentFactory()
    return Arquivo.objects.create(
        documento=documento,
        arquivo=ContentFile(b"conteudo de teste", name="teste.txt"),
        tipo_arquivo="original",
    )


def _run_task(arquivo, request_id=None, header_id=None, process_side_effect=None):
    """Helper para executar a task com patches e capturar o ID visto pelo processamento."""
    captured = {}
    kwargs = {}
    headers = {}

    if request_id is not None:
        kwargs["request_id"] = request_id
    if header_id is not None:
        headers["x-request-id"] = header_id

    def fake_process(file):
        captured["request_id"] = request_id_var.get()
        captured["arquivo_id"] = str(file.pk)
        if process_side_effect is not None:
            process_side_effect(file)

    with patch("apps.documents.tasks.process_uploaded_file", side_effect=fake_process):
        result = processar_arquivo_async.apply(
            args=[str(arquivo.pk)],
            kwargs=kwargs if kwargs else None,
            headers=headers if headers else None,
        )

    return result, captured


@pytest.mark.django_db
class TestProcessarArquivoAsync:
    def test_task_usa_request_id_do_cabecalho(self, arquivo):
        result, captured = _run_task(arquivo, header_id="req-abc-123")

        assert result.successful()
        assert result.result["status"] == "ok"
        assert result.result["arquivo_id"] == str(arquivo.pk)
        assert captured["request_id"] == "req-abc-123"
        assert captured["arquivo_id"] == str(arquivo.pk)
        assert request_id_var.get() == ""

    def test_task_aceita_request_id_via_kwarg_legado(self, arquivo):
        result, captured = _run_task(arquivo, request_id="legacy-123")

        assert result.successful()
        assert captured["request_id"] == "legacy-123"
        assert request_id_var.get() == ""

    def test_cabecalho_tem_precedencia_sobre_kwarg(self, arquivo):
        result, captured = _run_task(arquivo, request_id="legacy-123", header_id="header-123")

        assert result.successful()
        assert captured["request_id"] == "header-123"
        assert request_id_var.get() == ""

    def test_sem_request_id_nao_altera_context_var(self, arquivo):
        request_id_var.set("pre-existente")

        with patch("apps.documents.tasks.process_uploaded_file") as mock_process:
            result = processar_arquivo_async.apply(args=[str(arquivo.pk)])

        assert result.successful()
        assert request_id_var.get() == "pre-existente"
        mock_process.assert_called_once()

    def test_context_var_e_resetado_apos_excecao(self, arquivo):
        captured = {}

        def fake_process(file):
            captured["request_id"] = request_id_var.get()
            raise RuntimeError("falha simulada")

        with (
            patch("apps.documents.tasks.process_uploaded_file", side_effect=fake_process),
            pytest.raises(Retry),
        ):
            processar_arquivo_async.apply(
                args=[str(arquivo.pk)],
                headers={"x-request-id": "req-falha-123"},
            )

        assert captured["request_id"] == "req-falha-123"
        assert request_id_var.get() == ""
