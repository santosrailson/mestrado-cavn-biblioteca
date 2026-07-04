import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def clear_cache():
    """Limpa o cache Django antes de cada teste para evitar interferência entre testes."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def visitante(db):
    return UserFactory(role=UserRole.VISITOR)


@pytest.fixture
def catalogador(db):
    return UserFactory(role=UserRole.CATALOGUER)


@pytest.fixture
def curador(db):
    return UserFactory(role=UserRole.CURATOR)


@pytest.fixture
def administrador(db):
    return UserFactory(role=UserRole.ADMINISTRATOR)
