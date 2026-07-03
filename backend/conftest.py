import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def clear_cache():
    """Limpa o cache Django antes de cada teste para evitar interferência entre testes."""
    cache.clear()
    yield
    cache.clear()
