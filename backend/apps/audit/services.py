"""Serviço de auditoria."""

from django.db import transaction

from apps.audit.models import Auditoria


class AuditoriaService:
    """Helper para registro de eventos de auditoria."""

    @staticmethod
    def registrar(
        usuario=None,
        acao="",
        entidade="",
        entidade_id="",
        dados_anteriores=None,
        dados_novos=None,
        request=None,
    ):
        """Cria um registro de auditoria."""
        ip = None
        user_agent = ""
        if request:
            from apps.core.utils import get_client_ip

            ip = get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")

        with transaction.atomic():
            previous = Auditoria.objects.select_for_update().order_by("-created_at", "-id").first()
            registro = Auditoria(
                usuario=usuario,
                acao=acao,
                entidade=entidade,
                entidade_id=str(entidade_id) if entidade_id else "",
                dados_anteriores=dados_anteriores or {},
                dados_novos=dados_novos or {},
                ip_address=ip,
                user_agent=user_agent,
                previous_hash=previous.integrity_hash if previous else "",
            )
            registro.save()
            return registro


def verify_integrity_chain():
    """Valida a cadeia inteira e retorna o primeiro erro encontrado, se houver."""
    previous_hash = ""
    for registro in Auditoria.objects.order_by("created_at", "id"):
        if registro.previous_hash != previous_hash:
            return False, f"Ligação inválida no registro {registro.pk}."
        if registro.integrity_hash != registro.calculate_integrity_hash():
            return False, f"Hash inválido no registro {registro.pk}."
        previous_hash = registro.integrity_hash
    return True, "Cadeia de auditoria íntegra."
