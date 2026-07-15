"""Relatório periódico de acessos privilegiados."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.core.constants import UserRole
from apps.users.models import User


class Command(BaseCommand):
    help = "Lista usuários privilegiados sem login recente ou sem 2FA confirmado."

    def add_arguments(self, parser):
        parser.add_argument("--inactive-days", type=int, default=90)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options["inactive_days"])
        users = User.objects.filter(
            role__in=[UserRole.CATALOGUER, UserRole.CURATOR, UserRole.ADMINISTRATOR],
            is_active=True,
        ).order_by("email")
        self.stdout.write("email\tperfil\tultimo_login\t2fa\tação")
        for user in users:
            has_2fa = TOTPDevice.objects.filter(user=user, confirmed=True).exists()
            inactive = not user.last_login or user.last_login < cutoff
            action = "revisar" if inactive or not has_2fa else "ok"
            self.stdout.write(
                f"{user.email}\t{user.role}\t{user.last_login or '-'}\t"
                f"{'ativo' if has_2fa else 'ausente'}\t{action}"
            )
