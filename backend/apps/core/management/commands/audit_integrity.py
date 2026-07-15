"""Verifica a cadeia criptográfica da auditoria."""

from django.core.management.base import BaseCommand, CommandError

from apps.audit.services import verify_integrity_chain


class Command(BaseCommand):
    help = "Valida a cadeia de integridade dos registros de auditoria."

    def handle(self, *args, **options):
        valid, message = verify_integrity_chain()
        if not valid:
            raise CommandError(message)
        self.stdout.write(self.style.SUCCESS(message))
