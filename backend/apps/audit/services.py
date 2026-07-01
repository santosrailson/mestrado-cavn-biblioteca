"""Serviço de auditoria."""

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

        return Auditoria.objects.create(
            usuario=usuario,
            acao=acao,
            entidade=entidade,
            entidade_id=str(entidade_id) if entidade_id else "",
            dados_anteriores=dados_anteriores or {},
            dados_novos=dados_novos or {},
            ip_address=ip,
            user_agent=user_agent,
        )
