"""ViewSet de eventos da linha do tempo."""

from rest_framework import viewsets

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
