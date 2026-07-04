"""Middlewares utilitários do app core."""

import contextvars
import uuid


class NoCacheAPIMiddleware:
    """Adiciona headers anti-cache apenas em respostas de métodos mutáveis da API.

    GETs públicos (categorias, configurações, documentos etc.) podem ser
    cacheados pelo navegador/CDN; operações de escrita nunca devem ser.
    """

    MUTABLE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if (
            request.path.startswith("/api/v1/")
            and request.method in self.MUTABLE_METHODS
        ):
            response.headers.setdefault(
                "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers.setdefault("Pragma", "no-cache")
            response.headers.setdefault("Expires", "0")

        return response


request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)


class RequestIdMiddleware:
    """Gera (ou reaproveita) um ID de correlação por requisição.

    Disponível em request_id_var para ser incluído nos logs (inclusive os
    emitidos por tasks Celery disparadas dentro da mesma requisição via
    .delay(), desde que o ID seja propagado explicitamente nos kwargs da task).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_id = request.META.get("HTTP_X_REQUEST_ID", "")
        request_id = incoming_id or str(uuid.uuid4())
        token = request_id_var.set(request_id)
        request.request_id = request_id
        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)
        response["X-Request-ID"] = request_id
        return response
