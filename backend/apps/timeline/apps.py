from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class TimelineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.timeline"
    verbose_name = _("Linha do tempo")
