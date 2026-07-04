"""AdminSite customizado que exige verificação 2FA apenas de staff com dispositivo confirmado."""

from django.contrib import admin
from django_otp.forms import OTPAuthenticationForm
from django_otp.plugins.otp_totp.models import TOTPDevice


class ConditionalOTPAdminSite(admin.AdminSite):
    """Espelha a regra de 2FA do login da API (CustomTokenObtainPairView): só exige
    verificação OTP de staff que já configurou um dispositivo confirmado, evitando
    bloquear acidentalmente quem ainda não ativou o 2FA.
    """

    login_form = OTPAuthenticationForm

    def has_permission(self, request):
        if not super().has_permission(request):
            return False
        has_device = TOTPDevice.objects.filter(
            user=request.user, confirmed=True
        ).exists()
        if has_device and not request.user.is_verified():
            return False
        return True


def install_conditional_otp_admin():
    """Substitui a classe da instância padrão de admin.site pela variante com 2FA condicional."""
    admin.site.__class__ = ConditionalOTPAdminSite
