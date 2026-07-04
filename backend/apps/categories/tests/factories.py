import factory

from apps.categories.models import Categoria


class CategoriaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Categoria

    nome = factory.Sequence(lambda n: f"Categoria {n}")
