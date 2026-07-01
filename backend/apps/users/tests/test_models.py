import pytest

from apps.core.constants import UserRole
from apps.users.models import User


@pytest.mark.django_db
def test_user_role_helpers():
    admin = User.objects.create_user(
        email="admin@cavn.br",
        username="admin",
        password="testpass",
        role=UserRole.ADMINISTRATOR,
    )
    visitor = User.objects.create_user(
        email="visitante@cavn.br",
        username="visitante",
        password="testpass",
        role=UserRole.VISITOR,
    )

    assert admin.is_administrator
    assert admin.can_moderate()
    assert not visitor.can_catalogue()
