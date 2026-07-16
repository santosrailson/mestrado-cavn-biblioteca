"""Serviços de negócio para documentos e arquivos."""

import logging

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from PIL import Image

from apps.core.constants import AntivirusStatus, DocumentStatus, ProcessingStatus
from apps.core.utils import calculate_sha256
from apps.documents.models import Arquivo

logger = logging.getLogger(__name__)


class WorkflowError(Exception):
    """Erro de transição de workflow."""


class MalwareDetectedError(Exception):
    """Arquivo rejeitado por diagnóstico de malware."""


class DocumentWorkflowService:
    """Gerencia as transições de estado do workflow documental."""

    VALID_TRANSITIONS = {
        DocumentStatus.DRAFT: [DocumentStatus.UNDER_REVIEW],
        DocumentStatus.UNDER_REVIEW: [DocumentStatus.APPROVED, DocumentStatus.REJECTED],
        DocumentStatus.APPROVED: [DocumentStatus.PUBLISHED, DocumentStatus.ARCHIVED],
        DocumentStatus.REJECTED: [DocumentStatus.DRAFT, DocumentStatus.ARCHIVED],
        DocumentStatus.PUBLISHED: [DocumentStatus.ARCHIVED],
        DocumentStatus.ARCHIVED: [],
    }

    @classmethod
    def submit(cls, document, user):
        """Submete um rascunho para revisão."""
        return cls._transition(document, DocumentStatus.UNDER_REVIEW, user)

    @classmethod
    def approve(cls, document, user):
        """Aprova um documento em revisão."""
        return cls._transition(document, DocumentStatus.APPROVED, user)

    @classmethod
    def reject(cls, document, user, motivo=""):
        """Rejeita um documento em revisão."""
        document = cls._transition(document, DocumentStatus.REJECTED, user)
        if motivo:
            document.motivo_rejeicao = motivo
            document.save(update_fields=["motivo_rejeicao"])
        return document

    @classmethod
    def publish(cls, document, user):
        """Publica um documento aprovado."""
        return cls._transition(document, DocumentStatus.PUBLISHED, user)

    @classmethod
    def archive(cls, document, user):
        """Arquiva um documento."""
        return cls._transition(document, DocumentStatus.ARCHIVED, user)

    @classmethod
    def _transition(cls, document, new_status, user):
        with transaction.atomic():
            locked_document = type(document).objects.select_for_update().get(pk=document.pk)
            current = locked_document.status
            if new_status not in cls.VALID_TRANSITIONS.get(current, []):
                raise WorkflowError(f"Transição inválida de '{current}' para '{new_status}'.")
            locked_document.status = new_status
            if new_status == DocumentStatus.APPROVED:
                locked_document.aprovado_por = user
                locked_document.data_aprovacao = timezone.now()
            # Pass the workflow actor so the audit signal records the correct user.
            locked_document._audit_user = user
            locked_document.save()

            # Mantém o objeto já carregado pelos ViewSets atualizado para que a
            # resposta e a camada de testes não observem o estado anterior.
            document.status = locked_document.status
            document.aprovado_por_id = locked_document.aprovado_por_id
            document.data_aprovacao = locked_document.data_aprovacao
            document.updated_at = locked_document.updated_at
        return document


class FileService:
    """Serviços utilitários para processamento de arquivos."""

    THUMBNAIL_SIZE = (300, 300)

    @staticmethod
    def scan_for_malware(arquivo):
        """Escaneia via daemon configurado e falha fechado quando exigido."""

        if not getattr(settings, "ANTIVIRUS_ENABLED", False):
            arquivo.antivirus_status = AntivirusStatus.SKIPPED
            arquivo.antivirus_diagnostico = "scanner desabilitado no ambiente"
            arquivo.antivirus_escaneado_em = timezone.now()
            arquivo.save(
                update_fields=[
                    "antivirus_status",
                    "antivirus_diagnostico",
                    "antivirus_escaneado_em",
                ]
            )
            return

        arquivo.antivirus_status = AntivirusStatus.SCANNING
        arquivo.save(update_fields=["antivirus_status"])
        try:
            import clamd

            client = clamd.ClamdNetworkSocket(
                host=getattr(settings, "ANTIVIRUS_HOST", "clamav"),
                port=getattr(settings, "ANTIVIRUS_PORT", 3310),
                timeout=getattr(settings, "ANTIVIRUS_TIMEOUT_SECONDS", 30),
            )
            client.ping()
            arquivo.arquivo.seek(0)
            result = client.instream(arquivo.arquivo)
            arquivo.arquivo.seek(0)
            status_value, diagnostic = result.get("stream", ("ERROR", "resposta inválida"))
            if status_value == "FOUND":
                arquivo.antivirus_status = AntivirusStatus.INFECTED
                arquivo.antivirus_diagnostico = str(diagnostic or "ameaça detectada")[:500]
                arquivo.antivirus_escaneado_em = timezone.now()
                arquivo.arquivo.delete(save=False)
                arquivo.save(
                    update_fields=[
                        "arquivo",
                        "antivirus_status",
                        "antivirus_diagnostico",
                        "antivirus_escaneado_em",
                    ]
                )
                raise MalwareDetectedError(arquivo.antivirus_diagnostico)
            if status_value != "OK":
                raise RuntimeError(str(diagnostic or "scanner indisponível"))
            arquivo.antivirus_status = AntivirusStatus.CLEAN
            arquivo.antivirus_diagnostico = "OK"
        except MalwareDetectedError:
            raise
        except Exception as exc:
            arquivo.antivirus_status = AntivirusStatus.UNAVAILABLE
            arquivo.antivirus_diagnostico = str(exc)[:500]
            if getattr(settings, "ANTIVIRUS_REQUIRED", False):
                arquivo.antivirus_escaneado_em = timezone.now()
                arquivo.save(
                    update_fields=[
                        "antivirus_status",
                        "antivirus_diagnostico",
                        "antivirus_escaneado_em",
                    ]
                )
                raise RuntimeError("Scanner antivírus obrigatório indisponível") from exc
            logger.warning("Scanner antivírus indisponível para arquivo %s", arquivo.pk)
        arquivo.antivirus_escaneado_em = timezone.now()
        arquivo.save(
            update_fields=[
                "antivirus_status",
                "antivirus_diagnostico",
                "antivirus_escaneado_em",
            ]
        )

    @staticmethod
    def calculate_checksum(arquivo):
        """Calcula e persiste o checksum SHA-256 do arquivo."""
        if not arquivo.arquivo:
            return None
        checksum = calculate_sha256(arquivo.arquivo)
        arquivo.checksum_sha256 = checksum
        arquivo.tamanho_bytes = arquivo.arquivo.size
        return checksum

    @staticmethod
    def detect_mime_type(arquivo):
        """Detecta o MIME type do arquivo via python-magic."""
        try:
            import magic

            if arquivo.arquivo:
                arquivo.arquivo.seek(0)
                mime = magic.from_buffer(arquivo.arquivo.read(2048), mime=True)
                arquivo.mime_type = mime or ""
                arquivo.arquivo.seek(0)
                return mime
        except Exception:
            return ""
        return ""

    @classmethod
    def generate_thumbnail(cls, arquivo):
        """Gera thumbnail para imagens."""
        if (
            not arquivo.arquivo
            or not arquivo.mime_type
            or not arquivo.mime_type.startswith("image/")
        ):
            return None
        try:
            img = Image.open(arquivo.arquivo)
            img.thumbnail(cls.THUMBNAIL_SIZE)
            thumb_name = f"thumb_{arquivo.nome_armazenado}"
            from io import BytesIO

            buffer = BytesIO()
            fmt = img.format or "JPEG"
            img.save(buffer, format=fmt)
            thumb_file = ContentFile(buffer.getvalue(), name=thumb_name)
            return Arquivo.objects.create(
                documento=arquivo.documento,
                nome_original=f"thumbnail_{arquivo.nome_original}",
                nome_armazenado=thumb_name,
                arquivo=thumb_file,
                tipo_arquivo="thumbnail",
                mime_type=arquivo.mime_type,
                largura=img.width,
                altura=img.height,
                antivirus_status=AntivirusStatus.CLEAN,
                antivirus_diagnostico="derivado de arquivo já escaneado",
                antivirus_escaneado_em=timezone.now(),
            )
        except Exception as exc:
            logger.warning(
                "Falha ao gerar thumbnail para arquivo %s: %s",
                arquivo.pk,
                exc,
                exc_info=True,
            )
            return None


def _run_ocr(arquivo) -> str:
    """Tenta OCR no arquivo; retorna texto extraído ou string vazia."""
    try:
        import pytesseract
    except ImportError:
        return ""

    try:
        if arquivo.mime_type and arquivo.mime_type.startswith("image/"):
            img = Image.open(arquivo.arquivo.path)
            return pytesseract.image_to_string(img, lang="por+eng").strip()
        if arquivo.mime_type == "application/pdf":
            from pdf2image import convert_from_path  # type: ignore[import]

            pages = convert_from_path(arquivo.arquivo.path, dpi=150, first_page=1, last_page=5)
            return "\n\n".join(
                pytesseract.image_to_string(p, lang="por+eng").strip() for p in pages
            ).strip()
    except Exception as exc:
        logger.warning("OCR falhou para arquivo %s: %s", arquivo.pk, exc)
    return ""


def process_uploaded_file(arquivo):
    """Processa um arquivo recém-enviado: checksum, mime, thumbnail e OCR."""

    def update_progress(progress, stage):
        arquivo.processamento_status = ProcessingStatus.PROCESSING
        arquivo.processamento_progresso = progress
        arquivo.processamento_etapa = stage
        arquivo.save(
            update_fields=["processamento_status", "processamento_progresso", "processamento_etapa"]
        )

    update_progress(5, "verificando antivírus")
    FileService.scan_for_malware(arquivo)
    update_progress(10, "detectando formato")
    FileService.detect_mime_type(arquivo)
    update_progress(30, "calculando checksum")
    FileService.calculate_checksum(arquivo)
    update_progress(55, "gerando miniatura")
    if arquivo.mime_type and arquivo.mime_type.startswith("image/"):
        FileService.generate_thumbnail(arquivo)
    update_progress(70, "executando OCR")
    texto_ocr = _run_ocr(arquivo)
    if texto_ocr:
        arquivo.conteudo_ocr = texto_ocr
    arquivo.processado_ocr = True
    arquivo.processamento_status = ProcessingStatus.COMPLETED
    arquivo.processamento_etapa = "concluído"
    arquivo.processamento_progresso = 100
    arquivo.processamento_erro = ""
    arquivo.save()
    return arquivo
