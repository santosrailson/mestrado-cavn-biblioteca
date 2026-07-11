"""Utilitários de cache para endpoints públicos da API."""

import hashlib
import logging
from collections.abc import Callable
from functools import wraps

from django.core.cache import cache
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _make_cache_key(prefix: str, request, view_kwargs: dict | None = None) -> str:
    """Gera chave de cache estável a partir do prefixo, path params e query params."""
    params = tuple(sorted(request.query_params.items()))
    user_role = getattr(request.user, "role", "anonymous")
    kwargs_part = tuple(sorted((view_kwargs or {}).items()))
    try:
        version = cache.get(f"api:cache-version:{prefix}", 1)
    except Exception:  # pragma: no cover - cache indisponível
        version = 1
    raw = f"{prefix}:{version}:{user_role}:{kwargs_part}:{params}"
    return f"api:cache:{prefix}:{hashlib.sha256(raw.encode()).hexdigest()[:32]}"


def cached_response(prefix: str, ttl: int = 60):
    """Decorator para cachear respostas de ViewSets/APIViews públicas.

    A resposta é cacheada apenas para métodos seguros (GET/HEAD/OPTIONS) e
    usuários anônimos. Requisições autenticadas de catalogadores/curadores
    não usam cache para evitar dados desatualizados no admin.
    """

    def decorator(view_method: Callable) -> Callable:
        @wraps(view_method)
        def wrapper(view_instance, request, *args, **kwargs):
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                return view_method(view_instance, request, *args, **kwargs)

            user = getattr(request, "user", None)
            if user and user.is_authenticated and getattr(user, "can_catalogue", lambda: False)():
                return view_method(view_instance, request, *args, **kwargs)

            cache_key = _make_cache_key(prefix, request, kwargs)
            try:
                cached = cache.get(cache_key)
            except Exception as exc:  # pragma: no cover - Redis indisponível
                logger.warning("cache_read_error", extra={"error": str(exc)})
                cached = None

            if cached is not None:
                return Response(
                    cached["data"], status=cached.get("status", 200), headers=cached.get("headers")
                )

            response = view_method(view_instance, request, *args, **kwargs)

            if response.status_code == 200:
                try:
                    payload = {
                        "data": response.data,
                        "status": response.status_code,
                        "headers": dict(response.headers) if hasattr(response, "headers") else {},
                    }
                    cache.set(cache_key, payload, ttl)
                except Exception as exc:  # pragma: no cover
                    logger.warning("cache_write_error", extra={"error": str(exc)})

            return response

        return wrapper

    return decorator


def invalidate_cache_prefix(prefix: str) -> None:
    """Invalida um namespace sem executar SCAN/DELETE no Redis."""
    key = f"api:cache-version:{prefix}"
    try:
        version = 2 if cache.add(key, 2, timeout=None) else cache.incr(key)
        logger.info("cache_prefix_invalidated", extra={"prefix": prefix, "version": version})
    except Exception as exc:  # pragma: no cover
        logger.warning("cache_invalidation_error", extra={"prefix": prefix, "error": str(exc)})
