"""Views utilitárias do app core."""

import calendar
import logging

from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Auditoria
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
        result.append({
            "mes": calendar.month_abbr[dt.month].capitalize(),
            "acessos": por_mes.get(chave, 0),
        })
    return result


class HealthCheckView(APIView):
    """Endpoint simples de verificação de saúde da API."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "cavn-digital-backend"})


class DashboardView(APIView):
    """Endpoint de métricas para o dashboard administrativo."""

    permission_classes = [IsCataloguer]
    CACHE_KEY = "dashboard:metrics"
    CACHE_TTL = 300  # 5 minutos

    def _compute_dashboard(self, hoje):
        inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        docs = Document.objects.filter(deleted_at__isnull=True)
        por_status = dict(
            docs.values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        documentos_por_tipo = list(
            docs.exclude(tipo_documento="")
            .values("tipo_documento")
            .annotate(quantidade=Count("id"))
            .values("tipo_documento", "quantidade")
            .order_by("-quantidade")
        )

        atividades_recentes = Auditoria.objects.select_related("usuario").order_by(
            "-created_at"
        )[:6]

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
                    "usuario": {
                        "nome": a.usuario.get_full_name() or a.usuario.email
                    }
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
        return Response(status=status.HTTP_204_NO_CONTENT)
