"""Serializers para eventos da linha do tempo."""

from rest_framework import serializers

from apps.documents.models import Document
from apps.timeline.models import TimelineEvent


class TimelineEventDocumentSerializer(serializers.ModelSerializer):
    """Mini-representação do documento vinculado a um evento de timeline."""

    class Meta:
        model = Document
        fields = ["id", "titulo", "slug"]


class TimelineEventSerializer(serializers.ModelSerializer):
    """Serializer para eventos da linha do tempo."""

    data_precisao_display = serializers.CharField(
        source="get_data_precisao_display",
        read_only=True,
    )
    documento = TimelineEventDocumentSerializer(read_only=True)
    documento_titulo = serializers.CharField(
        source="documento.titulo",
        read_only=True,
    )

    class Meta:
        model = TimelineEvent
        fields = [
            "id",
            "titulo",
            "descricao",
            "data_evento",
            "data_precisao",
            "data_precisao_display",
            "imagem_destaque",
            "documento",
            "documento_titulo",
            "destaque",
            "ordem",
            "created_at",
        ]
