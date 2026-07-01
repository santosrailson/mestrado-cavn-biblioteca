"""Serializers para tags."""

from rest_framework import serializers

from apps.tags.models import Tag


class TagSerializer(serializers.ModelSerializer):
    """Serializer de leitura/escrita para tags."""

    class Meta:
        model = Tag
        fields = ["id", "nome", "slug", "contagem_uso", "created_at", "updated_at"]
        read_only_fields = ["slug", "contagem_uso"]
