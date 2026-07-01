"""Serviços de negócio para documentos e arquivos."""

import logging

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from PIL import Image

from apps.core.constants import DocumentStatus
from apps.core.utils import calculate_sha256
from apps.documents.models import Arquivo

logger = logging.getLogger(__name__)


class WorkflowError(Exception):
    """Erro de transição de workflow."""


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
        current = document.status
        if new_status not in cls.VALID_TRANSITIONS.get(current, []):
            raise WorkflowError(
                f"Transição inválida de '{current}' para '{new_status}'."
            )
        document.status = new_status
        if new_status == DocumentStatus.APPROVED:
            document.aprovado_por = user
            document.data_aprovacao = timezone.now()
        # Pass the workflow actor so the audit signal records the correct user.
        document._audit_user = user
        document.save()
        return document


class FileService:
    """Serviços utilitários para processamento de arquivos."""

    THUMBNAIL_SIZE = (300, 300)

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


@transaction.atomic
def process_uploaded_file(arquivo):
    """Processa um arquivo recém-enviado: checksum, mime, thumbnail e OCR."""
    FileService.detect_mime_type(arquivo)
    FileService.calculate_checksum(arquivo)
    if arquivo.mime_type and arquivo.mime_type.startswith("image/"):
        FileService.generate_thumbnail(arquivo)
    texto_ocr = _run_ocr(arquivo)
    if texto_ocr:
        arquivo.conteudo_ocr = texto_ocr
    arquivo.save()
    return arquivo
