"""ViewSets da galeria."""

from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from apps.gallery.models import Album, Foto
from apps.gallery.serializers import AlbumListSerializer, AlbumSerializer, FotoSerializer
from apps.users.permissions import IsCuratorOrAdminOrReadOnly


class _FotoPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AlbumViewSet(viewsets.ModelViewSet):
    """Endpoint de álbuns da galeria."""

    queryset = Album.objects.all()
    serializer_class = AlbumSerializer
    permission_classes = [IsCuratorOrAdminOrReadOnly]
    lookup_field = "slug"
    search_fields = ["titulo", "descricao"]
    filterset_fields = ["destaque"]
    ordering_fields = ["created_at", "titulo"]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == "list":
            return AlbumListSerializer
        return AlbumSerializer

    def get_queryset(self):
        qs = Album.objects.all()
        if self.action == "retrieve":
            qs = qs.prefetch_related("fotos")
        return qs


class FotoViewSet(viewsets.ModelViewSet):
    """Endpoint de fotos da galeria (50 por página)."""

    queryset = Foto.objects.select_related("album").all()
    serializer_class = FotoSerializer
    permission_classes = [IsCuratorOrAdminOrReadOnly]
    filterset_fields = ["album"]
    ordering_fields = ["ordem", "created_at"]
    pagination_class = _FotoPagination
