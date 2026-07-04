"""Helpers de rate limiting para views do DRF."""

from functools import wraps

from django_ratelimit.core import is_ratelimited
from rest_framework import status
from rest_framework.response import Response


class RateLimitedMixin:
    """Mixin para class-based views do DRF que aplica rate limiting por IP.

    Atributos configuráveis:
      - rate_limit_group: nome do grupo (padrão: nome da classe)
      - rate_limit_key: chave do django-ratelimit (padrão: 'ip')
      - rate_limit_rate: taxa no formato django-ratelimit (padrão: '5/m')
    """

    rate_limit_group = None
    rate_limit_key = "ip"
    rate_limit_rate = "5/m"

    def dispatch(self, request, *args, **kwargs):
        underlying = getattr(request, "_request", request)
        ratelimited = is_ratelimited(
            request=underlying,
            group=self.rate_limit_group or self.__class__.__name__,
            key=self.rate_limit_key,
            rate=self.rate_limit_rate,
            method=is_ratelimited.ALL,
            increment=True,
        )
        if ratelimited:
            return Response(
                {"detail": "Muitas tentativas. Aguarde um momento."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return super().dispatch(request, *args, **kwargs)


def drf_ratelimit(*, group: str, key: str = "ip", rate: str = "5/m"):
    """Decorador de rate limiting compatível com function-based views do DRF.

    Retorna HTTP 429 quando o limite é excedido.
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            underlying = getattr(request, "_request", request)
            ratelimited = is_ratelimited(
                request=underlying,
                group=group,
                key=key,
                rate=rate,
                method=is_ratelimited.ALL,
                increment=True,
            )
            if ratelimited:
                return Response(
                    {"detail": "Muitas tentativas. Aguarde um momento."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator
