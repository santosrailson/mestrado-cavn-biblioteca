import pytest

from apps.categories.models import Categoria


@pytest.mark.django_db
def test_categoria_hierarchy():
    pai = Categoria.objects.create(nome="Documentos", slug="documentos")
    filha = Categoria.objects.create(nome="Atas", slug="atas", parent=pai)

    assert filha.get_full_path() == "Documentos > Atas"
    assert pai.children.count() == 1
