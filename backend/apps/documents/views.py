"""ViewSets e views para documentos e arquivos."""

from django.contrib.postgres.search import SearchQuery, SearchRank
from django.core.exceptions import PermissionDenied
from django.db import connection
from django.db.models import Count, Prefetch, Q
from django.db.models import F as _F
from django.http import HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.audit.services import AuditoriaService
from apps.categories.models import Categoria
from apps.core.cache import cached_response
from apps.core.middleware import request_id_var
from apps.documents.filters import DocumentFilter
from apps.documents.models import Arquivo, Autor, Document, DocumentoRelacionado
from apps.documents.permissions import CanApproveDocument, CanEditDocument
from apps.documents.serializers import (
    ArquivoSerializer,
    ArquivoUploadSerializer,
    AutorSerializer,
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentWriteSerializer,
)
from apps.documents.services import DocumentWorkflowService, WorkflowError
from apps.documents.tasks import processar_arquivo_async
from apps.users.permissions import IsCataloguer


class DocumentViewSet(viewsets.ModelViewSet):
    """ViewSet para documentos públicos e administrativos."""

    queryset = Document.objects.all()
    lookup_field = "slug"
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = DocumentFilter
    search_fields = ["titulo", "descricao", "resumo", "arquivos__conteudo_ocr"]
    ordering_fields = ["created_at", "data_documento", "titulo"]

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.filter(deleted_at__isnull=True)
        if not (user and user.is_authenticated and user.can_catalogue()):
            qs = qs.filter(status="publicado")

        capa_prefetch = Prefetch(
            "arquivos",
            queryset=Arquivo.objects.filter(
                tipo_arquivo="original", mime_type__startswith="image/"
            ).select_related("documento"),
            to_attr="capas",
        )  # type: ignore

        # Prefetch usado em listagens e também como base do retrieve.
        categorias_prefetch = Prefetch(
            "categorias",
            queryset=Categoria.objects.filter(ativo=True)
            .annotate(
                contagem_documentos=Count(
                    "categoria_documentos",
                    filter=Q(
                        categoria_documentos__documento__status="publicado",
                        categoria_documentos__documento__deleted_at__isnull=True,
                    ),
                    distinct=True,
                )
            )
            .prefetch_related(
                Prefetch(
                    "parent",
                    queryset=Categoria.objects.all(),
                    to_attr="_prefetched_parent_cache",
                ),
                Prefetch(
                    "children",
                    queryset=Categoria.objects.filter(ativo=True),
                    to_attr="_prefetched_children_cache",
                ),
            ),
        )

        qs = qs.prefetch_related(
            capa_prefetch,
            "autores",
            categorias_prefetch,
            "tags",
        )

        if self.action == "retrieve":
            qs = qs.select_related("created_by", "aprovado_por").prefetch_related(
                "arquivos",
                Prefetch(
                    "relacionamentos_origem",
                    queryset=DocumentoRelacionado.objects.select_related(
                        "documento_destino"
                    ).prefetch_related(
                        Prefetch(
                            "documento_destino__arquivos",
                            queryset=Arquivo.objects.filter(
                                tipo_arquivo="original", mime_type__startswith="image/"
                            ).select_related("documento"),
                            to_attr="capas",
                        )
                    ),
                ),
            )

        return qs

    @cached_response("documents:list", ttl=120)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @cached_response("documents:detail", ttl=300)
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return DocumentWriteSerializer
        if self.action == "retrieve":
            return DocumentDetailSerializer
        return DocumentListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsCataloguer()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAuthenticated(), CanEditDocument()]
        if self.action == "submeter":
            return [IsAuthenticated(), CanEditDocument()]
        if self.action in ["aprovar", "rejeitar", "publicar", "arquivar"]:
            return [IsAuthenticated(), CanApproveDocument()]
        if self.action == "arquivos":
            return [IsAuthenticated(), CanEditDocument()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanEditDocument],
    )
    def submeter(self, request, slug=None):
        document = self.get_object()
        try:
            DocumentWorkflowService.submit(document, request.user)
            return Response({"status": document.status})
        except WorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanApproveDocument],
    )
    def aprovar(self, request, slug=None):
        document = self.get_object()
        try:
            DocumentWorkflowService.approve(document, request.user)
            return Response({"status": document.status})
        except WorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanApproveDocument],
    )
    def rejeitar(self, request, slug=None):
        document = self.get_object()
        motivo = request.data.get("motivo", "")
        try:
            DocumentWorkflowService.reject(document, request.user, motivo=motivo)
            return Response(
                {"status": document.status, "motivo_rejeicao": document.motivo_rejeicao}
            )
        except WorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanApproveDocument],
    )
    def publicar(self, request, slug=None):
        document = self.get_object()
        try:
            DocumentWorkflowService.publish(document, request.user)
            return Response({"status": document.status})
        except WorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanApproveDocument],
    )
    def arquivar(self, request, slug=None):
        document = self.get_object()
        try:
            DocumentWorkflowService.archive(document, request.user)
            return Response({"status": document.status})
        except WorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, CanEditDocument],
    )
    def arquivos(self, request, slug=None):
        document = self.get_object()
        # Garante que 'documento' sempre reflete o PK da URL, não um valor enviado pelo cliente
        data = {**request.data, "documento": document.pk}
        if "arquivo" in request.FILES:
            data["arquivo"] = request.FILES["arquivo"]
        serializer = ArquivoUploadSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        arquivo = serializer.save()
        processar_arquivo_async.apply_async(
            args=[str(arquivo.pk)],
            headers={"x-request-id": request_id_var.get()},
        )
        return Response(ArquivoSerializer(arquivo).data, status=status.HTTP_201_CREATED)


class AutorViewSet(viewsets.ModelViewSet):
    """ViewSet para autores."""

    queryset = Autor.objects.all()
    serializer_class = AutorSerializer
    search_fields = ["nome"]
    ordering_fields = ["nome", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCataloguer()]
        return []


class ArquivoViewSet(viewsets.ModelViewSet):
    """ViewSet para arquivos."""

    def get_queryset(self):
        user = self.request.user
        qs = Arquivo.objects.select_related("documento")
        # Usuários não autenticados só veem arquivos de documentos publicados.
        if not (user and user.is_authenticated and user.can_catalogue()):
            qs = qs.filter(documento__status="publicado", documento__deleted_at__isnull=True)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return ArquivoUploadSerializer
        return ArquivoSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanEditDocument()]
        if self.action in ["update", "partial_update"]:
            return [IsAuthenticated(), CanEditDocument()]
        if self.action == "destroy":
            return [IsAuthenticated()]
        # Leituras são públicas; o queryset já filtra por documentos publicados.
        return [AllowAny()]

    def perform_create(self, serializer):
        documento = serializer.validated_data.get("documento")
        if not CanEditDocument().has_object_permission(self.request, self, documento):
            raise PermissionDenied(
                "Você não tem permissão para adicionar arquivos a este documento."
            )
        arquivo = serializer.save()
        processar_arquivo_async.apply_async(
            args=[str(arquivo.pk)],
            headers={"x-request-id": request_id_var.get()},
        )

    def perform_destroy(self, instance):
        documento = instance.documento
        if not CanEditDocument().has_object_permission(self.request, self, documento):
            raise PermissionDenied("Você não tem permissão para remover este arquivo.")
        arquivo_id = str(instance.pk)
        instance.delete()
        AuditoriaService.registrar(
            usuario=self.request.user,
            acao="excluir",
            entidade="Arquivo",
            entidade_id=arquivo_id,
            request=self.request,
        )

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """Serve arquivo via X-Accel-Redirect com verificação de permissão."""
        arquivo = self.get_object()
        documento = arquivo.documento
        user = request.user

        is_public = documento.status == "publicado" and documento.deleted_at is None
        can_access_private = (
            user
            and user.is_authenticated
            and (user.can_catalogue() or user == documento.created_by)
        )

        if not is_public and not can_access_private:
            return Response(
                {"detail": "Você não tem permissão para acessar este arquivo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        response = HttpResponse()
        response["Content-Type"] = arquivo.mime_type or "application/octet-stream"
        response["Content-Disposition"] = f'inline; filename="{arquivo.nome_original}"'
        response["X-Accel-Redirect"] = f"/media-protected/{arquivo.arquivo.name}"
        return response

    @action(detail=False, methods=["get"], url_path="authorize")
    def authorize(self, request):
        """Usado pelo Nginx auth_request para /media/documentos/."""
        original_uri = request.headers.get("X-Original-Uri", "")
        # Remove o prefixo /media/ para obter o caminho relativo no storage.
        if original_uri.startswith("/media/"):
            relative_path = original_uri[len("/media/") :]
        else:
            relative_path = original_uri.lstrip("/")

        if not relative_path:
            return Response(status=status.HTTP_403_FORBIDDEN)

        try:
            arquivo = Arquivo.objects.select_related("documento").get(arquivo=relative_path)
        except Arquivo.DoesNotExist:
            return Response(status=status.HTTP_403_FORBIDDEN)

        documento = arquivo.documento
        is_public = documento.status == "publicado" and documento.deleted_at is None
        user = request.user
        can_access_private = (
            user
            and user.is_authenticated
            and (user.can_catalogue() or user == documento.created_by)
        )

        if is_public or can_access_private:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_403_FORBIDDEN)


class BuscaViewSet(viewsets.GenericViewSet):
    """Endpoint de busca full-text (PostgreSQL FTS com fallback LIKE)."""

    serializer_class = DocumentListSerializer

    @cached_response("search", ttl=120)
    def list(self, request):
        query = request.query_params.get("q", "").strip()
        capa_prefetch = Prefetch(
            "arquivos",
            queryset=Arquivo.objects.filter(
                tipo_arquivo="original", mime_type__startswith="image/"
            ),
            to_attr="capas",
        )
        qs = Document.objects.filter(status="publicado", deleted_at__isnull=True)

        # Aplica filtros auxiliares (categoria, tag, tipo, data, autor, status).
        filters = DocumentFilter(request.query_params, queryset=qs)
        qs = filters.qs

        if query:
            if connection.vendor == "postgresql":
                search_query = SearchQuery(query, config="portuguese", search_type="websearch")
                qs = (
                    qs.filter(
                        Q(search_vector=search_query)
                        | Q(titulo__icontains=query)
                        | Q(arquivos__conteudo_ocr__icontains=query)
                    )
                    .annotate(rank=SearchRank(_F("search_vector"), search_query))
                    .order_by("-rank", "-created_at")
                    .distinct()
                )
            else:
                qs = (
                    qs.filter(
                        Q(titulo__icontains=query) | Q(arquivos__conteudo_ocr__icontains=query)
                    )
                    .order_by("-created_at")
                    .distinct()
                )
        else:
            qs = qs.order_by("-created_at")

        qs = qs.prefetch_related(capa_prefetch, "autores", "categorias", "tags")
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        return (
            self.get_paginated_response(serializer.data)
            if page is not None
            else Response(serializer.data)
        )
