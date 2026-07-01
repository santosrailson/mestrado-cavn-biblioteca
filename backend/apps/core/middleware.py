"""Middlewares utilitários do app core."""


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
