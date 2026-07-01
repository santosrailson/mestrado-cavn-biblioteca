import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.timeline.models import TimelineEvent
from apps.users.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()


@pytest.fixture
def curador(db):
    return User.objects.create_user(
        email="curador@cavn.br",
        username="curador",
        password="testpass",
        role=UserRole.CURATOR,
    )


@pytest.mark.django_db
def test_eventos_list_is_public(api_client):
    TimelineEvent.objects.create(titulo="Fundação do CAVN", data_evento="1965-01-01")
    TimelineEvent.objects.create(titulo="Primeira turma", data_evento="1966-03-01")

    response = api_client.get("/api/v1/timeline/eventos/")
    assert response.status_code == 200
    titulos = [e["titulo"] for e in response.data]
    assert "Fundação do CAVN" in titulos
    assert "Primeira turma" in titulos


@pytest.mark.django_db
def test_eventos_ordered_by_data_evento(api_client):
    TimelineEvent.objects.create(titulo="Evento B", data_evento="1970-01-01")
    TimelineEvent.objects.create(titulo="Evento A", data_evento="1965-01-01")

    response = api_client.get("/api/v1/timeline/eventos/")
    assert response.status_code == 200
    titulos = [e["titulo"] for e in response.data]
    assert titulos.index("Evento A") < titulos.index("Evento B")


@pytest.mark.django_db
def test_filter_destaques(api_client):
    TimelineEvent.objects.create(
        titulo="Evento destaque", data_evento="1965-01-01", destaque=True
    )
    TimelineEvent.objects.create(
        titulo="Evento comum", data_evento="1966-01-01", destaque=False
    )

    response = api_client.get("/api/v1/timeline/eventos/?destaque=true")
    assert response.status_code == 200
    titulos = [e["titulo"] for e in response.data]
    assert "Evento destaque" in titulos
    assert "Evento comum" not in titulos


@pytest.mark.django_db
def test_create_evento_requires_auth(api_client):
    response = api_client.post(
        "/api/v1/timeline/eventos/",
        {"titulo": "Novo evento", "data_evento": "1980-06-01"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_evento_authenticated(api_client, curador):
    api_client.force_authenticate(user=curador)
    response = api_client.post(
        "/api/v1/timeline/eventos/",
        {"titulo": "Novo evento", "data_evento": "1980-06-01"},
        format="json",
    )
    assert response.status_code == 201
    assert TimelineEvent.objects.filter(titulo="Novo evento").exists()
