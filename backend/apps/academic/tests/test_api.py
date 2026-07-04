import pytest
from rest_framework.test import APIClient

from apps.academic.models import ProducaoAcademica
from apps.academic.tests.factories import ProducaoAcademicaFactory
from apps.core.constants import UserRole
from apps.users.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def curador(db):
    return User.objects.create_user(
        email="curador@cavn.br",
        username="curador",
        password="testpass",
        role=UserRole.CURATOR,
    )


@pytest.mark.django_db
def test_producoes_list_is_public(api_client):
    ProducaoAcademica.objects.create(titulo="Memória do CAVN", autor="João Silva", ano=2020)
    ProducaoAcademica.objects.create(titulo="Gestão Rural", autor="Maria Lima", ano=2021)

    response = api_client.get("/api/v1/producao-academica/")
    assert response.status_code == 200
    titulos = [p["titulo"] for p in response.data["results"]]
    assert "Memória do CAVN" in titulos
    assert "Gestão Rural" in titulos


@pytest.mark.django_db
def test_producao_detail_by_slug(api_client):
    producao = ProducaoAcademica.objects.create(
        titulo="Memória do CAVN", autor="João Silva", ano=2020
    )

    response = api_client.get(f"/api/v1/producao-academica/{producao.slug}/")
    assert response.status_code == 200
    assert response.data["titulo"] == "Memória do CAVN"


@pytest.mark.django_db
def test_filter_by_tipo(api_client):
    ProducaoAcademica.objects.create(
        titulo="Tese sobre solos", autor="A", ano=2019, tipo="tese"
    )
    ProducaoAcademica.objects.create(
        titulo="Artigo de irrigação", autor="B", ano=2020, tipo="artigo"
    )

    response = api_client.get("/api/v1/producao-academica/?tipo=tese")
    assert response.status_code == 200
    titulos = [p["titulo"] for p in response.data["results"]]
    assert "Tese sobre solos" in titulos
    assert "Artigo de irrigação" not in titulos


@pytest.mark.django_db
def test_filter_by_ano(api_client):
    ProducaoAcademica.objects.create(titulo="TCC 2018", autor="A", ano=2018)
    ProducaoAcademica.objects.create(titulo="TCC 2022", autor="B", ano=2022)

    response = api_client.get("/api/v1/producao-academica/?ano=2018")
    assert response.status_code == 200
    titulos = [p["titulo"] for p in response.data["results"]]
    assert "TCC 2018" in titulos
    assert "TCC 2022" not in titulos


@pytest.mark.django_db
def test_create_producao_requires_auth(api_client):
    response = api_client.post(
        "/api/v1/producao-academica/",
        {"titulo": "Novo trabalho", "autor": "C", "ano": 2023},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_producao_authenticated(api_client, curador):
    api_client.force_authenticate(user=curador)
    response = api_client.post(
        "/api/v1/producao-academica/",
        {"titulo": "Novo trabalho", "autor": "C", "ano": 2023},
        format="json",
    )
    assert response.status_code == 201
    assert ProducaoAcademica.objects.filter(titulo="Novo trabalho").exists()


@pytest.mark.django_db
class TestProducaoAcademicaRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post(
            "/api/v1/producao-academica/",
            {"titulo": "Tese Nova", "autor": "Fulano", "ano": 2023},
        )
        assert response.status_code == 403

    def test_cataloguer_cannot_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post(
            "/api/v1/producao-academica/",
            {"titulo": "Tese Nova", "autor": "Fulano", "ano": 2023},
        )
        assert response.status_code == 403

    def test_curator_can_create(self, api_client, curador):
        api_client.force_authenticate(user=curador)
        response = api_client.post(
            "/api/v1/producao-academica/",
            {"titulo": "Tese Nova", "autor": "Fulano", "ano": 2023},
        )
        assert response.status_code == 201

    def test_cataloguer_cannot_delete(self, api_client, catalogador):
        producao = ProducaoAcademicaFactory()
        api_client.force_authenticate(user=catalogador)
        response = api_client.delete(f"/api/v1/producao-academica/{producao.slug}/")
        assert response.status_code == 403
        assert ProducaoAcademica.objects.filter(pk=producao.pk).exists()
