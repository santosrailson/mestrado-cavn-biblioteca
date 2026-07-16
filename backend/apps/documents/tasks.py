"""Tarefas assíncronas para processamento de documentos."""

import logging

from celery import shared_task

from apps.core.constants import ProcessingStatus
from apps.core.middleware import request_id_var
from apps.documents.models import Arquivo
from apps.documents.services import MalwareDetectedError, process_uploaded_file

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
        arquivo.processamento_status = ProcessingStatus.PROCESSING
        arquivo.processamento_etapa = "iniciando"
        arquivo.processamento_progresso = 1
        arquivo.processamento_erro = ""
        arquivo.save(
            update_fields=[
                "processamento_status",
                "processamento_etapa",
                "processamento_progresso",
                "processamento_erro",
            ]
        )
        process_uploaded_file(arquivo)
        return {"status": "ok", "arquivo_id": str(arquivo_id)}
    except Arquivo.DoesNotExist:
        logger.error("processar_arquivo_async: arquivo %s não encontrado", arquivo_id)
        return {"status": "error", "detail": "Arquivo não encontrado"}
    except MalwareDetectedError as exc:
        Arquivo.objects.filter(pk=arquivo_id).update(
            processamento_status=ProcessingStatus.FAILED,
            processamento_etapa="antivírus",
            processamento_erro=str(exc)[:2000],
        )
        logger.error("processar_arquivo_async: malware no arquivo %s", arquivo_id)
        return {"status": "rejected", "detail": "Arquivo rejeitado pelo antivírus"}
    except Exception as exc:
        Arquivo.objects.filter(pk=arquivo_id).update(
            processamento_status=ProcessingStatus.FAILED,
            processamento_etapa="falhou",
            processamento_erro=str(exc)[:2000],
        )
        logger.exception("processar_arquivo_async: falha no arquivo %s", arquivo_id)
        raise self.retry(exc=exc)
    finally:
        if token is not None:
            request_id_var.reset(token)
