"""ViewSet de tags."""

from rest_framework import viewsets

from apps.tags.models import Tag
from apps.tags.serializers import TagSerializer
from apps.users.permissions import IsCataloguer


class TagViewSet(viewsets.ModelViewSet):
    """Endpoint de tags (leitura pública, escrita para catalogadores+)."""

    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    search_fields = ["nome"]
    ordering_fields = ["nome", "contagem_uso", "created_at"]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCataloguer()]
        return []
