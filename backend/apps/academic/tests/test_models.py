import pytest

from apps.academic.models import ProducaoAcademica


@pytest.mark.django_db
def test_producao_academica_str():
    producao = ProducaoAcademica.objects.create(
        titulo="Memória institucional do CAVN",
        autor="João Silva",
        ano=2020,
    )
    assert str(producao) == "Memória institucional do CAVN (2020)"
    assert producao.slug.startswith("memoria-institucional-do-cavn")
