"""Admin da linha do tempo com django-unfold."""

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.timeline.models import TimelineEvent


class TimelineEventAdmin(ModelAdmin):
    """Admin para eventos da linha do tempo."""

    list_display = [
        "titulo",
        "data_evento",
        "data_precisao",
        "destaque",
        "ordem",
        "created_at",
    ]
    list_filter = ["destaque", "data_precisao", "data_evento"]
    search_fields = ["titulo", "descricao"]
    ordering = ["data_evento", "ordem"]


admin.site.register(TimelineEvent, TimelineEventAdmin)
