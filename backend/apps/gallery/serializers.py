"""Serializers para galeria."""

from rest_framework import serializers

from apps.gallery.models import Album, Foto


class FotoSerializer(serializers.ModelSerializer):
    """Serializer para fotos."""

    imagem_url = serializers.ImageField(source="imagem", read_only=True)

    class Meta:
        model = Foto
        fields = [
            "id",
            "album",
            "imagem",
            "imagem_url",
            "legenda",
            "ordem",
            "created_at",
        ]


class AlbumListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de álbuns."""

    capa_url = serializers.ImageField(source="capa", read_only=True)
    total_fotos = serializers.IntegerField(source="fotos.count", read_only=True)

    class Meta:
        model = Album
        fields = [
            "id",
            "titulo",
            "slug",
            "descricao",
            "capa",
            "capa_url",
            "destaque",
            "total_fotos",
            "created_at",
        ]


class AlbumSerializer(serializers.ModelSerializer):
    """Serializer completo para álbuns com fotos aninhadas."""

    fotos = FotoSerializer(many=True, read_only=True)
    capa_url = serializers.ImageField(source="capa", read_only=True)

    class Meta:
        model = Album
        fields = [
            "id",
            "titulo",
            "slug",
            "descricao",
            "capa",
            "capa_url",
            "destaque",
            "fotos",
            "created_at",
        ]
