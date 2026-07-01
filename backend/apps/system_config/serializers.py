"""Serializers para configurações."""

from rest_framework import serializers

from apps.system_config.models import Configuracao


class ConfiguracaoSerializer(serializers.ModelSerializer):
    """Serializer para configurações."""

    valor_tipada = serializers.CharField(source="get_valor", read_only=True)

    class Meta:
        model = Configuracao
        fields = [
            "id",
            "chave",
            "valor",
            "tipo",
            "descricao",
            "valor_tipada",
            "created_at",
            "updated_at",
        ]
        read_only_fields = []
