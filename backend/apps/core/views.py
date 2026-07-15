"""Views utilitárias do app core."""

import calendar
import logging
from datetime import timedelta

from django.core.cache import cache
from django.db import connections
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Auditoria
from apps.core.models import AnalyticsEvent
from apps.documents.models import Document
from apps.users.models import User
from apps.users.permissions import IsCataloguer

logger = logging.getLogger(__name__)


def _monthly_audit_counts(hoje):
    """Retorna contagem de registros de auditoria dos últimos 6 meses."""
    six_months_ago = hoje - timedelta(days=182)
    qs = (
        Auditoria.objects.filter(created_at__gte=six_months_ago)
        .annotate(mes=TruncMonth("created_at"))
        .values("mes")
        .annotate(total=Count("id"))
        .order_by("mes")
    )
    por_mes = {row["mes"]: row["total"] for row in qs}
    result = []
    for i in range(5, -1, -1):
        dt = hoje - timedelta(days=30 * i)
        # Normaliza para o primeiro dia do mês para coincidir com TruncMonth
        chave = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result.append(
            {
                "mes": calendar.month_abbr[dt.month].capitalize(),
                "acessos": por_mes.get(chave, 0),
            }
        )
    return result


class HealthCheckView(APIView):
    """Endpoint de verificação de saúde: confere Postgres e Redis, não só o processo."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        checks = {}

        try:
            connections["default"].cursor()
            checks["database"] = "ok"
        except Exception:
            checks["database"] = "erro"

        try:
            cache.set("health_check_probe", "1", timeout=5)
            checks["cache"] = "ok"
        except Exception:
            checks["cache"] = "erro"

        saudavel = all(v == "ok" for v in checks.values())
        return Response(
            {
                "status": "ok" if saudavel else "erro",
                "service": "cavn-digital-backend",
                "checks": checks,
            },
            status=status.HTTP_200_OK if saudavel else status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class DashboardView(APIView):
    """Endpoint de métricas para o dashboard administrativo."""

    permission_classes = [IsCataloguer]
    CACHE_KEY = "dashboard:metrics"
    CACHE_TTL = 300  # 5 minutos

    def _compute_dashboard(self, hoje):
        inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        docs = Document.objects.filter(deleted_at__isnull=True)
        por_status = dict(
            docs.values("status").annotate(count=Count("id")).values_list("status", "count")
        )

        documentos_por_tipo = list(
            docs.exclude(tipo_documento="")
            .values("tipo_documento")
            .annotate(quantidade=Count("id"))
            .values("tipo_documento", "quantidade")
            .order_by("-quantidade")
        )

        atividades_recentes = Auditoria.objects.select_related("usuario").order_by("-created_at")[
            :6
        ]

        return {
            "totalDocumentos": docs.count(),
            "documentosMes": docs.filter(created_at__gte=inicio_mes).count(),
            "pendentesRevisao": por_status.get("em_revisao", 0),
            "totalUsuarios": User.objects.filter(is_active=True).count(),
            "usuariosNovos": User.objects.filter(date_joined__gte=inicio_mes).count(),
            "acessosMensais": _monthly_audit_counts(hoje),
            "documentosPorTipo": [
                {"tipo": item["tipo_documento"], "quantidade": item["quantidade"]}
                for item in documentos_por_tipo
            ],
            "atividadesRecentes": [
                {
                    "id": a.id,
                    "usuarioId": a.usuario_id,
                    "usuario": {"nome": a.usuario.get_full_name() or a.usuario.email}
                    if a.usuario
                    else None,
                    "acao": a.acao,
                    "entidade": a.entidade,
                    "entidadeId": int(a.entidade_id)
                    if a.entidade_id and a.entidade_id.isdigit()
                    else None,
                    "createdAt": a.created_at,
                }
                for a in atividades_recentes
            ],
        }

    def get(self, request):
        hoje = timezone.now()
        data = cache.get(self.CACHE_KEY)
        if data is None:
            data = self._compute_dashboard(hoje)
            cache.set(self.CACHE_KEY, data, self.CACHE_TTL)
        return Response(data)


class WebVitalsView(APIView):
    """Recebe métricas de Web Vitals do frontend e as registra no log estruturado."""

    authentication_classes = []
    permission_classes = [AllowAny]

    _ALLOWED_METRICS = {"CLS", "FCP", "LCP", "TTFB", "INP"}

    def post(self, request):
        metric_name = request.data.get("name", "")
        if metric_name not in self._ALLOWED_METRICS:
            return Response(
                {"detail": "Métrica inválida."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        logger.info(
            "web_vital",
            extra={
                "metric": metric_name,
                "value": request.data.get("value"),
                "rating": request.data.get("rating"),
                "path": request.data.get("path"),
                "navigationType": request.data.get("navigationType"),
            },
        )
        AnalyticsEvent.objects.create(
            name="web_vital",
            properties={
                "metric": metric_name,
                "value": request.data.get("value"),
                "rating": request.data.get("rating"),
            },
            path=str(request.data.get("path", ""))[:255],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AnalyticsEventView(APIView):
    """Recebe eventos agregados de jornada sem armazenar conteúdo sensível."""

    authentication_classes = []
    permission_classes = []
    _ALLOWED_EVENTS = {
        "search_submitted",
        "search_completed",
        "search_no_results",
        "search_filters_cleared",
        "document_opened",
        "document_shared",
        "document_downloaded",
        "upload_started",
        "upload_completed",
        "upload_failed",
        "draft_restored",
        "draft_expired",
        "document_processing_failed",
    }

    def post(self, request):
        event_name = request.data.get("name", "")
        if event_name not in self._ALLOWED_EVENTS:
            return Response({"detail": "Evento inválido."}, status=status.HTTP_400_BAD_REQUEST)
        properties = request.data.get("properties", {})
        if not isinstance(properties, dict):
            properties = {}
        safe_properties = {
            str(key)[:64]: value
            for key, value in properties.items()
            if isinstance(value, str | int | float | bool) or value is None
        }
        AnalyticsEvent.objects.create(
            name=event_name,
            properties=safe_properties,
            path=str(request.data.get("path", ""))[:255],
        )
        logger.info(
            "ux_event",
            extra={
                "event": event_name,
                "properties": properties,
                "path": request.data.get("path", ""),
            },
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AnalyticsSummaryView(APIView):
    """Resumo agregado para medir sucesso, abandono e desempenho de jornadas."""

    permission_classes = [IsCataloguer]

    def get(self, request):
        days = min(max(int(request.query_params.get("days", 30)), 1), 365)
        since = timezone.now() - timedelta(days=days)
        rows = (
            AnalyticsEvent.objects.filter(created_at__gte=since)
            .values("name")
            .annotate(total=Count("id"))
            .order_by("name")
        )
        return Response({"days": days, "events": list(rows)})
