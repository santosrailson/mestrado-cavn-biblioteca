from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class SystemConfigConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.system_config"
    verbose_name = _("Configurações")
