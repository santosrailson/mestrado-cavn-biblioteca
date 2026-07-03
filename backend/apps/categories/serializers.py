"""Serializers para categorias."""

from rest_framework import serializers

from apps.categories.models import Categoria


class CategoriaSerializer(serializers.ModelSerializer):
    """Serializer recursivo para categorias."""

    children = serializers.SerializerMethodField(read_only=True)
    full_path = serializers.CharField(source="get_full_path", read_only=True)
    pai = serializers.SerializerMethodField(read_only=True)
    pai_id = serializers.PrimaryKeyRelatedField(
        source="parent",
        queryset=Categoria.objects.all(),
        required=False,
        allow_null=True,
    )
    contagemDocumentos = serializers.IntegerField(
        source="contagem_documentos", read_only=True, default=0
    )

    class Meta:
        model = Categoria
        fields = [
            "id",
            "nome",
            "slug",
            "descricao",
            "icone",
            "ordem",
            "ativo",
            "parent",
            "pai_id",
            "pai",
            "children",
            "full_path",
            "contagemDocumentos",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "full_path", "children", "pai", "contagemDocumentos"]

    def get_children(self, obj):
        # Usa filhos pré-carregados via Prefetch quando disponíveis.
        children = getattr(obj, "_prefetched_children_cache", None)
        if children is None:
            children = obj.children.filter(ativo=True)
        else:
            children = [c for c in children if getattr(c, "ativo", True)]
        return CategoriaSerializer(children, many=True).data

    def get_pai(self, obj):
        # Usa pai pré-carregado via Prefetch.
        parent_cache = getattr(obj, "_prefetched_parent_cache", None)
        if parent_cache is not None:
            # Prefetch de FK retorna QuerySet, mas pode ter sido convertido.
            if isinstance(parent_cache, Categoria):
                parent = parent_cache
            else:
                parent = next(iter(parent_cache), None)
                if parent is None or parent.id != obj.parent_id:
                    parent = None
        elif obj.parent_id:
            parent = obj.parent
        else:
            parent = None
        if parent:
            return {"id": str(parent.id), "nome": parent.nome}
        return None
