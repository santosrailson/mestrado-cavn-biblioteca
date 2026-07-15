"""Aplica a retenção de telemetria anônima."""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.core.models import AnalyticsEvent


class Command(BaseCommand):
    help = "Remove eventos anônimos de analytics mais antigos que o período informado."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=settings.ANALYTICS_RETENTION_DAYS)
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--confirm", action="store_true")

    def handle(self, *args, **options):
        days = options["days"]
        if days < 30:
            raise CommandError("O período mínimo de retenção de analytics é 30 dias.")
        cutoff = timezone.now() - timedelta(days=days)
        queryset = AnalyticsEvent.objects.filter(created_at__lt=cutoff)
        count = queryset.count()
        if options["dry_run"]:
            self.stdout.write(f"{count} evento(s) seriam removidos.")
            return
        if not options["confirm"]:
            raise CommandError("Use --confirm para executar a remoção; --dry-run apenas simula.")
        queryset.delete()
        self.stdout.write(self.style.SUCCESS(f"{count} evento(s) removidos."))
