import pytest
from rest_framework.test import APIClient

from apps.gallery.models import Album, Foto
from apps.gallery.tests.factories import AlbumFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_albums_list_is_public(api_client):
    Album.objects.create(titulo="Inauguração 1965", slug="inauguracao-1965")
    Album.objects.create(titulo="Formatura 1970", slug="formatura-1970")

    response = api_client.get("/api/v1/galeria/albuns/")
    assert response.status_code == 200
    titulos = [a["titulo"] for a in response.data]
    assert "Inauguração 1965" in titulos
    assert "Formatura 1970" in titulos


@pytest.mark.django_db
def test_album_detail_by_slug(api_client):
    Album.objects.create(titulo="Inauguração 1965", slug="inauguracao-1965")

    response = api_client.get("/api/v1/galeria/albuns/inauguracao-1965/")
    assert response.status_code == 200
    assert response.data["titulo"] == "Inauguração 1965"


@pytest.mark.django_db
def test_fotos_list_is_public(api_client):
    album = Album.objects.create(titulo="Inauguração 1965", slug="inauguracao-1965")
    Foto.objects.create(album=album, legenda="Entrada principal")

    response = api_client.get("/api/v1/galeria/fotos/")
    assert response.status_code == 200
    assert len(response.data) >= 1


@pytest.mark.django_db
def test_create_album_requires_auth(api_client):
    response = api_client.post(
        "/api/v1/galeria/albuns/",
        {"titulo": "Álbum novo", "slug": "album-novo"},
        format="json",
    )
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_album_authenticated(api_client, curador):
    api_client.force_authenticate(user=curador)
    response = api_client.post(
        "/api/v1/galeria/albuns/",
        {"titulo": "Álbum novo", "slug": "album-novo"},
        format="json",
    )
    assert response.status_code == 201
    assert Album.objects.filter(slug="album-novo").exists()


@pytest.mark.django_db
def test_fotos_filter_by_album(api_client):
    album_a = Album.objects.create(titulo="Álbum A", slug="album-a")
    album_b = Album.objects.create(titulo="Álbum B", slug="album-b")
    foto_a = Foto.objects.create(album=album_a, legenda="Foto do A")
    Foto.objects.create(album=album_b, legenda="Foto do B")

    response = api_client.get(f"/api/v1/galeria/fotos/?album={album_a.pk}")
    assert response.status_code == 200
    results = response.data["results"]
    ids = [f["id"] for f in results]
    assert str(foto_a.pk) in ids


@pytest.mark.django_db
class TestAlbumRBAC:
    def test_visitor_cannot_create(self, api_client, visitante):
        api_client.force_authenticate(user=visitante)
        response = api_client.post(
            "/api/v1/galeria/albuns/", {"titulo": "Álbum Novo", "slug": "album-novo"}
        )
        assert response.status_code == 403

    def test_cataloguer_cannot_create(self, api_client, catalogador):
        api_client.force_authenticate(user=catalogador)
        response = api_client.post(
            "/api/v1/galeria/albuns/", {"titulo": "Álbum Novo", "slug": "album-novo"}
        )
        assert response.status_code == 403

    def test_curator_can_create(self, api_client, curador):
        api_client.force_authenticate(user=curador)
        response = api_client.post(
            "/api/v1/galeria/albuns/", {"titulo": "Álbum Novo", "slug": "album-novo"}
        )
        assert response.status_code == 201

    def test_cataloguer_cannot_delete(self, api_client, catalogador):
        album = AlbumFactory()
        api_client.force_authenticate(user=catalogador)
        response = api_client.delete(f"/api/v1/galeria/albuns/{album.slug}/")
        assert response.status_code == 403
        assert Album.objects.filter(pk=album.pk).exists()
