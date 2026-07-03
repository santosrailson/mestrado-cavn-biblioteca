"""ViewSet de configurações do sistema."""

from rest_framework import viewsets
from rest_framework.response import Response

from apps.core.cache import cached_response
from apps.system_config.models import Configuracao
from apps.system_config.serializers import ConfiguracaoSerializer
from apps.users.permissions import IsAdministratorOrReadOnly


class ConfiguracaoViewSet(viewsets.ModelViewSet):
    """Endpoint de configurações do sistema."""

    queryset = Configuracao.objects.all()
    serializer_class = ConfiguracaoSerializer
    permission_classes = [IsAdministratorOrReadOnly]
    lookup_field = "chave"
    lookup_value_regex = "[^/]+"
    search_fields = ["chave", "descricao"]
    pagination_class = None

    @cached_response("config", ttl=600)
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
