"""Relatório operacional de solicitações LGPD próximas ou fora do prazo."""

import json

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.users.models import PrivacyRequest


class Command(BaseCommand):
    help = "Lista solicitações de privacidade abertas, próximas do prazo ou atrasadas."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", dest="as_json")

    def handle(self, *args, **options):
        now = timezone.now()
        requests = PrivacyRequest.objects.filter(
            status__in=[PrivacyRequest.Status.PENDING, PrivacyRequest.Status.IN_REVIEW]
        ).select_related("usuario", "responsavel")
        data = []
        for request in requests:
            overdue = bool(request.prazo_em and request.prazo_em < now)
            data.append(
                {
                    "id": str(request.pk),
                    "tipo": request.tipo,
                    "status": request.status,
                    "usuario": request.usuario.email,
                    "responsavel": request.responsavel.email if request.responsavel else None,
                    "prazo_em": request.prazo_em.isoformat() if request.prazo_em else None,
                    "atrasada": overdue,
                }
            )
        if options["as_json"]:
            self.stdout.write(json.dumps(data, ensure_ascii=False))
            return
        for item in data:
            marker = "ATRASADA" if item["atrasada"] else "aberta"
            self.stdout.write(f"{marker}: {item['id']} — {item['tipo']} — {item['usuario']}")
