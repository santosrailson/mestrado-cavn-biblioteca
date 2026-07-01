"""ViewSet de auditoria."""

from rest_framework import viewsets

from apps.audit.models import Auditoria
from apps.audit.serializers import AuditoriaSerializer
from apps.users.permissions import IsAdministrator


class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoint somente leitura de auditoria (apenas administradores)."""

    queryset = Auditoria.objects.all()
    serializer_class = AuditoriaSerializer
    permission_classes = [IsAdministrator]
    filterset_fields = ["acao", "entidade", "usuario"]
    search_fields = ["entidade", "entidade_id"]
    ordering_fields = ["created_at"]
