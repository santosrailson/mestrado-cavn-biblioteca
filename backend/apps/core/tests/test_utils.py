import hashlib
from io import BytesIO

from apps.core.utils import calculate_sha256, generate_unique_slug
from apps.tags.models import Tag


def test_calculate_sha256():
    data = b"conteudo de teste"
    file_obj = BytesIO(data)
    expected = hashlib.sha256(data).hexdigest()
    assert calculate_sha256(file_obj) == expected


def test_generate_unique_slug_creates_unique_values(db):
    slug1 = generate_unique_slug(Tag, "História")
    Tag.objects.create(nome="História", slug=slug1)
    slug2 = generate_unique_slug(Tag, "História")
    assert slug1 != slug2
