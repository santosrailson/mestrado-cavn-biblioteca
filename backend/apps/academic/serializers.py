"""Serializers para produção acadêmica."""

from rest_framework import serializers

from apps.academic.models import ProducaoAcademica


class ProducaoAcademicaSerializer(serializers.ModelSerializer):
    """Serializer para produção acadêmica."""

    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = ProducaoAcademica
        fields = [
            "id",
            "titulo",
            "slug",
            "tipo",
            "tipo_display",
            "autor",
            "orientador",
            "ano",
            "resumo",
            "palavras_chave",
            "url_acesso",
            "arquivo",
            "citacao_abnt",
            "ativo",
            "created_at",
        ]
