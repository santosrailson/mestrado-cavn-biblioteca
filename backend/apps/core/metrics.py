"""Métricas operacionais leves, sem dependência de um serviço externo."""

from __future__ import annotations

import re
from collections import defaultdict, deque
from threading import Lock
from time import perf_counter

_LOCK = Lock()
_REQUESTS = 0
_ERRORS = 0
_DURATIONS_MS: deque[float] = deque(maxlen=2000)
_BY_ROUTE: dict[str, dict[str, int]] = defaultdict(lambda: {"requests": 0, "errors": 0})
_DYNAMIC_SEGMENT = re.compile(r"(?:[0-9a-f]{8,}|[0-9]+|[0-9a-f-]{20,})", re.IGNORECASE)
_MAX_ROUTES = 500


def _route_name(request) -> str:
    route = getattr(getattr(request, "resolver_match", None), "route", None)
    if route:
        return route.replace("//", "/")[:160]
    return _DYNAMIC_SEGMENT.sub(":id", request.path).replace("//", "/")[:160]


def record_request(request, status_code: int, duration_ms: float) -> None:
    global _REQUESTS, _ERRORS
    route = f"{request.method} {_route_name(request)}"
    with _LOCK:
        _REQUESTS += 1
        if status_code >= 500:
            _ERRORS += 1
        _DURATIONS_MS.append(duration_ms)
        if route in _BY_ROUTE or len(_BY_ROUTE) < _MAX_ROUTES:
            _BY_ROUTE[route]["requests"] += 1
            if status_code >= 500:
                _BY_ROUTE[route]["errors"] += 1


def snapshot() -> dict:
    with _LOCK:
        durations = sorted(_DURATIONS_MS)
        p95_index = max(0, int(len(durations) * 0.95) - 1)
        return {
            "requests_total": _REQUESTS,
            "errors_5xx_total": _ERRORS,
            "error_rate": round(_ERRORS / _REQUESTS, 6) if _REQUESTS else 0,
            "latency_ms": {
                "p50": round(durations[max(0, int(len(durations) * 0.50) - 1)], 2)
                if durations
                else 0,
                "p95": round(durations[p95_index], 2) if durations else 0,
                "sample_size": len(durations),
            },
            "routes": {key: dict(value) for key, value in sorted(_BY_ROUTE.items())},
        }


class MetricsMiddleware:
    """Registra latência e erros sem guardar query strings ou dados pessoais."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = perf_counter()
        response = self.get_response(request)
        record_request(request, response.status_code, (perf_counter() - started) * 1000)
        return response
