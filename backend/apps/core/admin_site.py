"""AdminSite customizado com a política de 2FA da aplicação."""

from django.conf import settings
from django.contrib import admin
from django_otp.forms import OTPAuthenticationForm
from django_otp.plugins.otp_totp.models import TOTPDevice


class ConditionalOTPAdminSite(admin.AdminSite):
    """Aplica 2FA às sessões do Django Admin sem alterar o login da API."""

    login_form = OTPAuthenticationForm

    def has_permission(self, request):
        if not super().has_permission(request):
            return False
        has_device = TOTPDevice.objects.filter(user=request.user, confirmed=True).exists()
        if (
            getattr(settings, "MANDATORY_2FA_FOR_PRIVILEGED", False)
            and request.user.can_catalogue()
            and not has_device
        ):
            return False
        return not has_device or request.user.is_verified()


def install_conditional_otp_admin():
    """Substitui a classe da instância padrão de admin.site pela variante com 2FA condicional."""
    admin.site.__class__ = ConditionalOTPAdminSite
