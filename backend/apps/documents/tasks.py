"""Tarefas assíncronas para processamento de documentos."""

import logging

from celery import shared_task

from apps.documents.models import Arquivo
from apps.documents.services import process_uploaded_file

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def processar_arquivo_async(self, arquivo_id):
    """Processa um arquivo em background (checksum, mime, thumbnail, OCR)."""
    try:
        arquivo = Arquivo.objects.get(pk=arquivo_id)
        process_uploaded_file(arquivo)
        return {"status": "ok", "arquivo_id": str(arquivo_id)}
    except Arquivo.DoesNotExist:
        logger.error("processar_arquivo_async: arquivo %s não encontrado", arquivo_id)
        return {"status": "error", "detail": "Arquivo não encontrado"}
    except Exception as exc:
        logger.exception("processar_arquivo_async: falha no arquivo %s", arquivo_id)
        raise self.retry(exc=exc)
