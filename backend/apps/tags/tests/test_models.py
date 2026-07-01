import pytest

from apps.tags.models import Tag


@pytest.mark.django_db
def test_tag_slug_generation():
    tag = Tag.objects.create(nome="História do CAVN")
    assert tag.slug == "historia-do-cavn"
    assert str(tag) == "História do CAVN"
