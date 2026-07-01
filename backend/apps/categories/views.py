"""ViewSet de categorias."""

import logging

from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.response import Response

from apps.categories.models import Categoria
from apps.categories.serializers import CategoriaSerializer
from apps.users.permissions import IsCataloguer

logger = logging.getLogger(__name__)


class CategoriaViewSet(viewsets.ModelViewSet):
    """Endpoint de categorias (leitura pública, escrita para catalogadores+)."""

    queryset = Categoria.objects.filter(ativo=True).annotate(
        contagem_documentos=Count(
            "categoria_documentos",
            filter=Q(
                categoria_documentos__documento__status="publicado",
                categoria_documentos__documento__deleted_at__isnull=True,
            ),
            distinct=True,
        )
    )
    serializer_class = CategoriaSerializer
    lookup_field = "id"
    search_fields = ["nome", "descricao"]
    ordering_fields = ["nome", "ordem", "created_at"]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCataloguer()]
        return []

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        logger.info("listando_categorias", extra={"total": queryset.count(), "user": request.user.email if request.user.is_authenticated else "anonymous"})
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

