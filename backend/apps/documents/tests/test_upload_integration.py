import hashlib

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.core.constants import DocumentStatus, UserRole
from apps.documents.models import Arquivo, Document
from apps.users.tests.factories import UserFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def catalogador(db):
    return UserFactory(role=UserRole.CATALOGUER)


@pytest.fixture
def documento_proprio(catalogador):
    return Document.objects.create(
        titulo="Documento com Upload",
        status=DocumentStatus.DRAFT,
        created_by=catalogador,
    )


@pytest.mark.django_db
class TestUploadIntegration:
    def test_upload_bem_sucedido_calcula_checksum_e_metadados(
        self, api_client, catalogador, documento_proprio
    ):
        conteudo = b"Conteudo real do arquivo de teste para checksum."
        arquivo_upload = SimpleUploadedFile(
            "documento.txt", conteudo, content_type="text/plain"
        )
        api_client.force_authenticate(user=catalogador)

        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(documento_proprio.pk),
                "arquivo": arquivo_upload,
                "tipo_arquivo": "original",
            },
            format="multipart",
        )

        assert response.status_code == 201
        arquivo = Arquivo.objects.get(documento=documento_proprio)
        assert arquivo.tamanho_bytes == len(conteudo)
        assert arquivo.checksum_sha256 == hashlib.sha256(conteudo).hexdigest()
        assert arquivo.mime_type

    def test_upload_extensao_nao_permitida_e_rejeitado(
        self, api_client, catalogador, documento_proprio
    ):
        arquivo_upload = SimpleUploadedFile(
            "script.exe", b"MZ conteudo executavel falso", content_type="application/octet-stream"
        )
        api_client.force_authenticate(user=catalogador)

        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(documento_proprio.pk),
                "arquivo": arquivo_upload,
                "tipo_arquivo": "original",
            },
            format="multipart",
        )

        assert response.status_code == 400
        assert not Arquivo.objects.filter(documento=documento_proprio).exists()

    def test_upload_sem_extensao_e_rejeitado(
        self, api_client, catalogador, documento_proprio
    ):
        arquivo_upload = SimpleUploadedFile(
            "semextensao", b"conteudo qualquer", content_type="application/octet-stream"
        )
        api_client.force_authenticate(user=catalogador)

        response = api_client.post(
            "/api/v1/documentos/arquivos/",
            {
                "documento": str(documento_proprio.pk),
                "arquivo": arquivo_upload,
                "tipo_arquivo": "original",
            },
            format="multipart",
        )

        assert response.status_code == 400
        assert not Arquivo.objects.filter(documento=documento_proprio).exists()

    def test_dois_arquivos_com_mesmo_conteudo_geram_mesmo_checksum(
        self, api_client, catalogador, documento_proprio
    ):
        conteudo = b"Conteudo identico para os dois arquivos."
        api_client.force_authenticate(user=catalogador)

        for nome in ("primeiro.txt", "segundo.txt"):
            response = api_client.post(
                "/api/v1/documentos/arquivos/",
                {
                    "documento": str(documento_proprio.pk),
                    "arquivo": SimpleUploadedFile(nome, conteudo, content_type="text/plain"),
                    "tipo_arquivo": "original",
                },
                format="multipart",
            )
            assert response.status_code == 201

        checksums = set(
            Arquivo.objects.filter(documento=documento_proprio).values_list(
                "checksum_sha256", flat=True
            )
        )
        assert checksums == {hashlib.sha256(conteudo).hexdigest()}
