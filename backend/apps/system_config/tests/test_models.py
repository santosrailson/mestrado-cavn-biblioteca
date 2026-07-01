import pytest

from apps.system_config.models import Configuracao


@pytest.mark.django_db
def test_configuracao_tipos():
    bool_cfg = Configuracao.objects.create(
        chave="manutencao", valor="true", tipo=Configuracao.Tipo.BOOLEAN
    )
    int_cfg = Configuracao.objects.create(
        chave="itens_pagina", valor="20", tipo=Configuracao.Tipo.INTEGER
    )

    assert bool_cfg.get_valor() is True
    assert int_cfg.get_valor() == 20
