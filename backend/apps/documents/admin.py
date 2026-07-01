"""Admin de documentos com django-unfold."""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from apps.documents.models import (
    Arquivo,
    Autor,
    Document,
    DocumentoAutor,
    DocumentoCategoria,
    DocumentoRelacionado,
    DocumentoTag,
)


class ArquivoInline(StackedInline):
    model = Arquivo
    extra = 0
    fields = [
        "nome_original",
        "arquivo",
        "tipo_arquivo",
        "mime_type",
        "tamanho_bytes",
        "checksum_sha256",
        "processado_ocr",
    ]
    readonly_fields = ["mime_type", "tamanho_bytes", "checksum_sha256"]


class DocumentoAutorInline(TabularInline):
    model = DocumentoAutor
    extra = 1
    autocomplete_fields = ["autor"]


class DocumentoCategoriaInline(TabularInline):
    model = DocumentoCategoria
    extra = 1
    autocomplete_fields = ["categoria"]


class DocumentoTagInline(TabularInline):
    model = DocumentoTag
    extra = 1
    autocomplete_fields = ["tag"]


class DocumentoRelacionadoInline(TabularInline):
    model = DocumentoRelacionado
    fk_name = "documento_origem"
    extra = 1
    autocomplete_fields = ["documento_destino"]


class DocumentAdmin(ModelAdmin):
    """Admin para gestão de documentos e workflow."""

    list_display = [
        "titulo",
        "status",
        "tipo_documento",
        "data_documento",
        "created_by",
        "created_at",
    ]
    list_filter = ["status", "tipo_documento", "data_documento", "created_at"]
    search_fields = ["titulo", "descricao", "resumo", "codigo_referencia"]
    prepopulated_fields = {"slug": ("titulo",)}
    readonly_fields = [
        "created_at",
        "updated_at",
        "aprovado_por",
        "data_aprovacao",
        "deleted_at",
    ]
    inlines = [
        ArquivoInline,
        DocumentoAutorInline,
        DocumentoCategoriaInline,
        DocumentoTagInline,
        DocumentoRelacionadoInline,
    ]
    fieldsets = (
        (None, {"fields": ("titulo", "slug", "titulo_alternativo", "status")}),
        (
            _("Metadados"),
            {
                "fields": (
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
                )
            },
        ),
        (_("Workflow"), {"fields": ("aprovado_por", "data_aprovacao", "deleted_at")}),
        (_("Auditoria"), {"fields": ("created_by", "created_at", "updated_at")}),
    )


class AutorAdmin(ModelAdmin):
    """Admin para gestão de autores."""

    list_display = ["nome", "created_at"]
    search_fields = ["nome", "biografia"]


class ArquivoAdmin(ModelAdmin):
    """Admin para gestão de arquivos."""

    list_display = [
        "nome_original",
        "documento",
        "tipo_arquivo",
        "mime_type",
        "created_at",
    ]
    list_filter = ["tipo_arquivo", "mime_type", "processado_ocr"]
    search_fields = ["nome_original", "documento__titulo"]


admin.site.register(Document, DocumentAdmin)
admin.site.register(Autor, AutorAdmin)
admin.site.register(Arquivo, ArquivoAdmin)
