import factory

from apps.tags.models import Tag


class TagFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Tag

    nome = factory.Sequence(lambda n: f"tag-{n}")
