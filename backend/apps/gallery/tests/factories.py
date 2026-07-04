import factory

from apps.gallery.models import Album


class AlbumFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Album

    titulo = factory.Sequence(lambda n: f"Álbum {n}")
    slug = factory.Sequence(lambda n: f"album-{n}")
