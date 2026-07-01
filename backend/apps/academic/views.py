"""ViewSet de produção acadêmica."""

from rest_framework import viewsets

from apps.academic.models import ProducaoAcademica
from apps.academic.serializers import ProducaoAcademicaSerializer
from apps.users.permissions import IsCuratorOrAdminOrReadOnly


class ProducaoAcademicaViewSet(viewsets.ModelViewSet):
    """Endpoint de produção acadêmica."""

    queryset = ProducaoAcademica.objects.all()
    serializer_class = ProducaoAcademicaSerializer
    permission_classes = [IsCuratorOrAdminOrReadOnly]
    lookup_field = "slug"
    filterset_fields = ["tipo", "ano", "ativo"]
    search_fields = ["titulo", "autor", "orientador", "palavras_chave", "resumo"]
    ordering_fields = ["ano", "titulo", "created_at"]
