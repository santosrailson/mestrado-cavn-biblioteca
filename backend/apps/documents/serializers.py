"""Serializers para documentos e arquivos."""

from rest_framework import serializers

from apps.categories.models import Categoria
from apps.categories.serializers import CategoriaSerializer
from apps.core.utils import generate_unique_slug
from apps.documents.models import (
    Arquivo,
    Autor,
    Document,
    DocumentoAutor,
    DocumentoCategoria,
    DocumentoRelacionado,
    DocumentoTag,
)
from apps.tags.models import Tag
from apps.tags.serializers import TagSerializer
from apps.users.serializers import UserSerializer


class DocumentoRelacionadoSerializer(serializers.ModelSerializer):
    """Serializer para documentos relacionados."""

    id = serializers.UUIDField(source="documento_destino.id", read_only=True)
    titulo = serializers.CharField(source="documento_destino.titulo", read_only=True)
    slug = serializers.CharField(source="documento_destino.slug", read_only=True)
    tipo_relacao = serializers.CharField(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentoRelacionado
        fields = ["id", "titulo", "slug", "tipo_relacao", "thumbnail_url"]

    def get_thumbnail_url(self, obj):
        # Usa capas pré-carregadas (to_attr) se disponível, senão faz uma query.
        capas = getattr(obj.documento_destino, "capas", None)
        if capas is not None:
            capa = capas[0] if capas else None
        else:
            capa = obj.documento_destino.arquivos.filter(tipo_arquivo="original").first()
        return capa.arquivo.url if capa else None


class AutorSerializer(serializers.ModelSerializer):
    """Serializer para autores."""

    class Meta:
        model = Autor
        fields = ["id", "nome", "biografia", "data_nascimento", "data_falecimento"]


class ArquivoSerializer(serializers.ModelSerializer):
    """Serializer para arquivos."""

    url = serializers.SerializerMethodField()

    class Meta:
        model = Arquivo
        fields = [
            "id",
            "nome_original",
            "url",
            "mime_type",
            "tamanho_bytes",
            "checksum_sha256",
            "largura",
            "altura",
            "tipo_arquivo",
            "processado_ocr",
            "created_at",
        ]

    def get_url(self, obj):
        documento = obj.documento
        is_public = documento.status == "publicado" and documento.deleted_at is None
        user = self.context.get("request", {}).user if self.context.get("request") else None
        can_access_private = (
            user
            and user.is_authenticated
            and (user.can_catalogue() or user == documento.created_by)
        )

        if is_public or can_access_private:
            request = self.context.get("request")
            if not is_public and request is not None:
                return request.build_absolute_uri(
                    f"/api/v1/documentos/arquivos/{obj.pk}/download/"
                )
            return obj.arquivo.url
        return None


class DocumentListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagens públicas."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    capa = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "titulo",
            "slug",
            "resumo",
            "tipo_documento",
            "data_documento",
            "status",
            "status_display",
            "capa",
            "created_at",
        ]

    def get_capa(self, obj):
        # Usa o Prefetch to_attr="capas" do queryset para evitar N+1.
        capas = getattr(obj, "capas", None)
        capa = capas[0] if capas else None
        if capa is None:
            capa = obj.arquivos.filter(tipo_arquivo="original", mime_type__startswith="image/").first()
        return ArquivoSerializer(capa).data if capa else None


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalhe de documentos."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    data_precisao_display = serializers.CharField(
        source="get_data_precisao_display",
        read_only=True,
    )
    autores = AutorSerializer(many=True, read_only=True)
    arquivos = ArquivoSerializer(many=True, read_only=True)
    categorias = CategoriaSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    relacionados = serializers.SerializerMethodField()
    criadoPor = UserSerializer(source="created_by", read_only=True)
    aprovadoPor = UserSerializer(source="aprovado_por", read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "titulo",
            "slug",
            "titulo_alternativo",
            "descricao",
            "resumo",
            "codigo_referencia",
            "tipo_documento",
            "data_documento",
            "data_precisao",
            "data_precisao_display",
            "cobertura_temporal",
            "cobertura_espacial",
            "idioma",
            "direitos",
            "fonte",
            "relacao",
            "status",
            "status_display",
            "motivo_rejeicao",
            "criadoPor",
            "aprovadoPor",
            "data_aprovacao",
            "autores",
            "arquivos",
            "categorias",
            "tags",
            "relacionados",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "aprovado_por", "data_aprovacao"]

    def get_relacionados(self, obj):
        from django.db.models import Prefetch as _Prefetch

        capa_prefetch = _Prefetch(
            "documento_destino__arquivos",
            queryset=Arquivo.objects.filter(tipo_arquivo="original").select_related("documento"),
            to_attr="capas",
        )
        relacionamentos = (
            DocumentoRelacionado.objects.filter(documento_origem=obj)
            .select_related("documento_destino")
            .prefetch_related(capa_prefetch)
        )
        return DocumentoRelacionadoSerializer(relacionamentos, many=True).data


class DocumentWriteSerializer(serializers.ModelSerializer):
    """Serializer para criação/edição de documentos.

    Gerencia os relacionamentos Many-to-Many com tabelas intermediárias via
    campos explícitos, já que o DRF não grava M2M com ``through`` por padrão.
    """

    autor_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    autores = serializers.ListField(
        child=serializers.CharField(max_length=255),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    categoria_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "slug",
            "titulo",
            "titulo_alternativo",
            "descricao",
            "resumo",
            "codigo_referencia",
            "tipo_documento",
            "data_documento",
            "data_precisao",
            "cobertura_temporal",
            "cobertura_espacial",
            "idioma",
            "direitos",
            "fonte",
            "relacao",
            "status",
            "autor_ids",
            "autores",
            "categoria_ids",
            "tags",
        ]
        read_only_fields = ["id", "slug", "status"]

    def _sync_autores(self, documento, autor_ids, nomes_autores=None):
        ids = list(autor_ids or [])
        nomes = [nome.strip() for nome in (nomes_autores or []) if nome.strip()]

        # Resolve nomes em IDs, criando autores inexistentes.
        for nome in nomes:
            autor, _ = Autor.objects.get_or_create(nome=nome)
            if autor.pk not in ids:
                ids.append(autor.pk)

        documento.documento_autores.exclude(autor_id__in=ids).delete()
        existentes = set(
            documento.documento_autores.filter(autor_id__in=ids).values_list(
                "autor_id", flat=True
            )
        )
        for autor_id in ids:
            if autor_id not in existentes:
                DocumentoAutor.objects.create(
                    documento=documento,
                    autor_id=autor_id,
                    tipo_autoria="autor",
                )

    def _sync_categorias(self, documento, categoria_ids):
        ids = list(categoria_ids or [])
        documento.documento_categorias.exclude(categoria_id__in=ids).delete()
        existentes = set(
            documento.documento_categorias.filter(categoria_id__in=ids).values_list(
                "categoria_id", flat=True
            )
        )
        for categoria_id in ids:
            if categoria_id not in existentes:
                DocumentoCategoria.objects.create(
                    documento=documento,
                    categoria_id=categoria_id,
                )

    def validate_autor_ids(self, value):
        ids = list(value or [])
        existentes = set(
            Autor.objects.filter(id__in=ids).values_list("id", flat=True)
        )
        invalidos = [str(pk) for pk in ids if pk not in existentes]
        if invalidos:
            raise serializers.ValidationError(
                f"Autores não encontrados: {', '.join(invalidos)}"
            )
        return value

    def validate_categoria_ids(self, value):
        ids = list(value or [])
        existentes = set(
            Categoria.objects.filter(id__in=ids).values_list("id", flat=True)
        )
        invalidos = [str(pk) for pk in ids if pk not in existentes]
        if invalidos:
            raise serializers.ValidationError(
                f"Categorias não encontradas: {', '.join(invalidos)}"
            )
        return value

    def _sync_tags(self, documento, nomes_tags):
        nomes = [nome.strip().lower() for nome in (nomes_tags or []) if nome.strip()]
        tag_ids = []
        for nome in nomes:
            tag, _ = Tag.objects.get_or_create(
                nome=nome,
                defaults={"slug": generate_unique_slug(Tag, nome)},
            )
            tag_ids.append(tag.pk)

        documento.documento_tags.exclude(tag_id__in=tag_ids).delete()
        existentes = set(
            documento.documento_tags.filter(tag_id__in=tag_ids).values_list(
                "tag_id", flat=True
            )
        )
        for tag_id in tag_ids:
            if tag_id not in existentes:
                DocumentoTag.objects.create(documento=documento, tag_id=tag_id)

    def create(self, validated_data):
        autor_ids = validated_data.pop("autor_ids", None)
        nomes_autores = validated_data.pop("autores", None)
        categoria_ids = validated_data.pop("categoria_ids", None)
        nomes_tags = validated_data.pop("tags", None)
        documento = super().create(validated_data)
        self._sync_autores(documento, autor_ids, nomes_autores)
        self._sync_categorias(documento, categoria_ids)
        self._sync_tags(documento, nomes_tags)
        return documento

    def update(self, instance, validated_data):
        autor_ids = validated_data.pop("autor_ids", None)
        nomes_autores = validated_data.pop("autores", None)
        categoria_ids = validated_data.pop("categoria_ids", None)
        nomes_tags = validated_data.pop("tags", None)
        documento = super().update(instance, validated_data)
        self._sync_autores(documento, autor_ids, nomes_autores)
        self._sync_categorias(documento, categoria_ids)
        self._sync_tags(documento, nomes_tags)
        return documento


class ArquivoUploadSerializer(serializers.ModelSerializer):
    """Serializer para upload de arquivos."""

    nome_original = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Arquivo
        fields = [
            "id",
            "documento",
            "arquivo",
            "nome_original",
            "tipo_arquivo",
        ]
        extra_kwargs = {"documento": {"required": True}}

    def create(self, validated_data):
        arquivo = validated_data.get("arquivo")
        if not validated_data.get("nome_original") and arquivo:
            validated_data["nome_original"] = arquivo.name
        if not validated_data.get("tipo_arquivo"):
            validated_data["tipo_arquivo"] = "original"
        return super().create(validated_data)
