"""Serializers para auditoria."""

from rest_framework import serializers

from apps.audit.models import Auditoria


class AuditoriaSerializer(serializers.ModelSerializer):
    """Serializer de leitura para auditoria."""

    usuario_email = serializers.CharField(source="usuario.email", read_only=True)
    acao_display = serializers.CharField(source="get_acao_display", read_only=True)

    class Meta:
        model = Auditoria
        fields = [
            "id",
            "usuario",
            "usuario_email",
            "acao",
            "acao_display",
            "entidade",
            "entidade_id",
            "dados_anteriores",
            "dados_novos",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = fields
