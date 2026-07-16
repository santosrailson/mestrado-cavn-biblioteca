import pytest
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.models import PrivacyRequest, User
from apps.users.security import revoke_user_sessions


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_token_obtain_pair(api_client):
    User.objects.create_user(
        email="teste@cavn.br",
        username="teste",
        password="senha123",
        role=UserRole.VISITOR,
    )
    response = api_client.post(
        "/api/v1/auth/token/", {"email": "teste@cavn.br", "password": "senha123"}
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_me_endpoint_requires_auth(api_client):
    response = api_client.get("/api/v1/auth/me/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_titular_pode_registrar_e_listar_solicitacao_de_privacidade(api_client):
    user = User.objects.create_user(
        email="titular@cavn.br",
        username="titular",
        password="senha123",
        role=UserRole.VISITOR,
    )
    api_client.force_authenticate(user=user)

    created = api_client.post(
        "/api/v1/auth/privacy/requests/",
        {"tipo": "acesso", "descricao": "Quero acessar os dados da minha conta."},
        format="json",
    )
    assert created.status_code == 201
    assert created.data["status"] == "pendente"

    listed = api_client.get("/api/v1/auth/privacy/requests/")
    assert listed.status_code == 200
    assert len(listed.data["results"]) == 1
    assert listed.data["results"][0]["prazoEm"]


@pytest.mark.django_db
def test_exportacao_de_privacidade_nao_expoe_senha(api_client):
    user = User.objects.create_user(
        email="export@cavn.br",
        username="export",
        password="senha-secreta",
        role=UserRole.VISITOR,
    )
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/v1/auth/privacy/export/")
    assert response.status_code == 200
    assert response["Content-Disposition"].endswith('"cavn-dados-pessoais.json"')
    assert "senha" not in response.json()["profile"]


@pytest.mark.django_db
def test_revogacao_de_sessoes_invalida_access_token_emitido(api_client):
    user = User.objects.create_user(
        email="revogacao@cavn.br",
        username="revogacao",
        password="senha123",
    )
    login = api_client.post("/api/v1/auth/login/", {"email": user.email, "password": "senha123"})
    assert login.status_code == 200
    access = login.data["access"]

    revoke_user_sessions(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    response = api_client.get("/api/v1/auth/me/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_revogacao_de_sessoes_invalida_refresh_token(api_client):
    user = User.objects.create_user(
        email="revogacao-refresh@cavn.br",
        username="revogacao-refresh",
        password="senha123",
    )
    login = api_client.post("/api/v1/auth/login/", {"email": user.email, "password": "senha123"})
    assert login.status_code == 200

    revoke_user_sessions(user)
    api_client.cookies["cavn_refresh"] = login.data["refresh"]
    response = api_client.post("/api/v1/auth/refresh/", {})

    assert response.status_code == 401


@pytest.mark.django_db
def test_administrador_pode_resolver_solicitacao_sem_expor_solicitacoes_de_outro_titular(
    api_client,
):
    titular = User.objects.create_user(
        email="titular-resolucao@cavn.br",
        username="titular-resolucao",
        password="senha123",
        role=UserRole.VISITOR,
    )
    admin = User.objects.create_user(
        email="admin-privacidade@cavn.br",
        username="admin-privacidade",
        password="senha123",
        role=UserRole.ADMINISTRATOR,
    )
    request = PrivacyRequest.objects.create(
        usuario=titular, tipo="acesso", descricao="Preciso da cópia dos dados da conta."
    )
    api_client.force_authenticate(user=admin)
    response = api_client.patch(
        f"/api/v1/auth/privacy/requests/{request.pk}/",
        {"status": "concluida", "resposta": "Exportação disponibilizada."},
        format="json",
    )
    assert response.status_code == 200
    request.refresh_from_db()
    assert request.status == "concluida"
    assert request.resolvido_por == admin
