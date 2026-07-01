"""Filtros para documentos."""

import django_filters
from django.db import models

from apps.documents.models import Document


class DocumentFilter(django_filters.FilterSet):
    """Filtros avançados para documentos."""

    categoria = django_filters.CharFilter(
        field_name="categorias__slug",
        lookup_expr="iexact",
    )
    tag = django_filters.CharFilter(
        field_name="tags__slug",
        lookup_expr="iexact",
    )
    autor = django_filters.CharFilter(
        field_name="autores__nome",
        lookup_expr="icontains",
    )
    data_inicio = django_filters.DateFilter(
        field_name="data_documento",
        lookup_expr="gte",
    )
    data_fim = django_filters.DateFilter(
        field_name="data_documento",
        lookup_expr="lte",
    )
    status = django_filters.CharFilter(
        field_name="status",
        lookup_expr="iexact",
    )
    tipo = django_filters.CharFilter(
        field_name="tipo_documento",
        lookup_expr="iexact",
    )
    busca = django_filters.CharFilter(method="busca_livre")

    class Meta:
        model = Document
        fields = [
            "categoria",
            "tag",
            "autor",
            "status",
            "tipo",
            "data_inicio",
            "data_fim",
        ]

    def busca_livre(self, queryset, name, value):
        return queryset.filter(
            models.Q(titulo__icontains=value)
            | models.Q(descricao__icontains=value)
            | models.Q(resumo__icontains=value)
            | models.Q(arquivos__conteudo_ocr__icontains=value)
        ).distinct()
