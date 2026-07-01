"""Admin da galeria com django-unfold."""

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.gallery.models import Album, Foto


class FotoInline(TabularInline):
    model = Foto
    extra = 1
    fields = ["imagem", "legenda", "ordem"]


class AlbumAdmin(ModelAdmin):
    """Admin para álbuns de fotos."""

    list_display = ["titulo", "destaque", "created_at"]
    list_filter = ["destaque"]
    search_fields = ["titulo", "descricao"]
    inlines = [FotoInline]


class FotoAdmin(ModelAdmin):
    """Admin para fotos individuais."""

    list_display = ["album", "legenda", "ordem", "created_at"]
    list_filter = ["album"]
    search_fields = ["legenda"]


admin.site.register(Album, AlbumAdmin)
admin.site.register(Foto, FotoAdmin)
