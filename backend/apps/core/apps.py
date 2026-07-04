from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = _("Núcleo")

    def ready(self):
        from apps.core.admin_site import install_conditional_otp_admin

        install_conditional_otp_admin()
