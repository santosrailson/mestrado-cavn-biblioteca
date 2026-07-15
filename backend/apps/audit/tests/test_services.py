import pytest
from django.core.exceptions import ValidationError
from django.http import HttpRequest

from apps.audit.services import AuditoriaService, verify_integrity_chain
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestAuditoriaService:
    def test_basic_registration(self):
        registro = AuditoriaService.registrar(
            acao="criar",
            entidade="Document",
            entidade_id="123",
        )
        assert registro.acao == "criar"
        assert registro.entidade == "Document"
        assert registro.entidade_id == "123"
        assert registro.dados_anteriores == {}
        assert registro.dados_novos == {}
        assert registro.usuario is None

    def test_registration_with_user(self):
        user = UserFactory()
        registro = AuditoriaService.registrar(
            usuario=user,
            acao="atualizar",
            entidade="User",
            entidade_id=str(user.pk),
            dados_anteriores={"nome": "Antigo"},
            dados_novos={"nome": "Novo"},
        )
        assert registro.usuario == user
        assert registro.acao == "atualizar"
        assert registro.dados_anteriores == {"nome": "Antigo"}
        assert registro.dados_novos == {"nome": "Novo"}

    def test_registration_with_request(self):
        user = UserFactory()
        request = HttpRequest()
        request.META["HTTP_X_FORWARDED_FOR"] = "192.168.1.1"
        request.META["HTTP_USER_AGENT"] = "pytest/1.0"

        registro = AuditoriaService.registrar(
            usuario=user,
            acao="login",
            entidade="User",
            entidade_id=str(user.pk),
            request=request,
        )
        assert registro.ip_address == "192.168.1.1"
        assert registro.user_agent == "pytest/1.0"

    def test_different_actions(self):
        for acao in ["criar", "atualizar", "excluir", "login", "logout"]:
            registro = AuditoriaService.registrar(acao=acao, entidade="Test")
            assert registro.acao == acao

    def test_records_are_hash_chained_and_verifiable(self):
        first = AuditoriaService.registrar(acao="criar", entidade="Document")
        second = AuditoriaService.registrar(acao="atualizar", entidade="Document")

        assert second.previous_hash == first.integrity_hash
        assert verify_integrity_chain() == (True, "Cadeia de auditoria íntegra.")

    def test_records_cannot_be_changed_or_deleted(self):
        registro = AuditoriaService.registrar(acao="criar", entidade="Document")
        registro.entidade = "User"
        with pytest.raises(ValidationError):
            registro.save()
        with pytest.raises(ValidationError):
            registro.delete()
