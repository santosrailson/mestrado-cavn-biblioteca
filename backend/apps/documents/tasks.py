"""Tarefas assíncronas para processamento de documentos."""

import logging

from celery import shared_task

from apps.core.middleware import request_id_var
from apps.documents.models import Arquivo
from apps.documents.services import process_uploaded_file

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def processar_arquivo_async(self, arquivo_id: str, request_id: str = "") -> dict:
    """Processa um arquivo em background (checksum, mime, thumbnail, OCR).

    O correlation ID da requisição original pode vir via cabeçalho da task
    (``x-request-id``) ou pelo kwarg legado ``request_id``. O cabeçalho tem
    precedência. Essa dualidade mantém compatibilidade bidirecional durante
    deploys rolantes: producers antigos ainda enviam o kwarg, enquanto workers
    antigos ignoram o cabeçalho desconhecido e executam com ID vazio.

    O ID repassado para o ``ContextVar`` de correlation ID garante que os logs
    de processamento carreguem o mesmo ``request_id`` da requisição original.
    """
    header_id = ""
    if self.request.headers:
        header_id = self.request.headers.get("x-request-id", "")

    effective_request_id = header_id or request_id
    token = None
    if effective_request_id:
        token = request_id_var.set(effective_request_id)

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
    finally:
        if token is not None:
            request_id_var.reset(token)
