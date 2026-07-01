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
        queryset = obj.children.filter(ativo=True)
        return CategoriaSerializer(queryset, many=True).data

    def get_pai(self, obj):
        if obj.parent:
            return {"id": str(obj.parent.id), "nome": obj.parent.nome}
        return None
