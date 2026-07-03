"""ViewSet de eventos da linha do tempo."""

from rest_framework import viewsets
from rest_framework.response import Response

from apps.core.cache import cached_response
from apps.timeline.models import TimelineEvent
from apps.timeline.serializers import TimelineEventSerializer
from apps.users.permissions import IsCuratorOrAdminOrReadOnly


class TimelineEventViewSet(viewsets.ModelViewSet):
    """Endpoint de eventos históricos."""

    queryset = TimelineEvent.objects.select_related("documento").all()
    serializer_class = TimelineEventSerializer
    permission_classes = [IsCuratorOrAdminOrReadOnly]
    filterset_fields = ["destaque", "data_precisao", "data_evento"]
    search_fields = ["titulo", "descricao"]
    ordering_fields = ["data_evento", "ordem", "created_at"]
    pagination_class = None

    @cached_response("timeline", ttl=300)
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
