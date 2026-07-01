import pytest

from apps.gallery.models import Album, Foto


@pytest.mark.django_db
def test_album_and_foto():
    album = Album.objects.create(titulo="Inauguração 1965", slug="inauguracao-1965")
    foto = Foto.objects.create(album=album, legenda="Entrada principal")
    assert album.fotos.count() == 1
    assert str(foto) == "Inauguração 1965 — Entrada principal"
