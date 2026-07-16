import pytest
from django.test import override_settings
from django.urls import reverse
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestConditionalOTPAdmin:
    @override_settings(MANDATORY_2FA_FOR_PRIVILEGED=True)
    def test_admin_sem_2fa_e_bloqueado_quando_politica_e_obrigatoria(self, client):
        admin_user = UserFactory(role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True)
        client.force_login(admin_user)
        response = client.get(reverse("admin:index"))
        assert response.status_code == 302
        assert reverse("admin:login") in response.url

    def test_admin_without_2fa_device_can_access(self, client):
        admin_user = UserFactory(role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True)
        client.force_login(admin_user)
        response = client.get(reverse("admin:index"))
        assert response.status_code == 200

    def test_admin_with_unconfirmed_device_can_access(self, client):
        admin_user = UserFactory(role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True)
        TOTPDevice.objects.create(user=admin_user, name="default", confirmed=False)
        client.force_login(admin_user)
        response = client.get(reverse("admin:index"))
        assert response.status_code == 200

    def test_admin_with_confirmed_device_blocked_until_verified(self, client):
        admin_user = UserFactory(role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True)
        TOTPDevice.objects.create(user=admin_user, name="default", confirmed=True)
        client.force_login(admin_user)
        response = client.get(reverse("admin:index"))
        assert response.status_code == 302
        assert reverse("admin:login") in response.url

    def test_admin_with_verified_device_can_access(self, client):
        admin_user = UserFactory(role=UserRole.ADMINISTRATOR, is_staff=True, is_superuser=True)
        device = TOTPDevice.objects.create(user=admin_user, name="default", confirmed=True)
        client.force_login(admin_user)
        session = client.session
        session[DEVICE_ID_SESSION_KEY] = device.persistent_id
        session.save()
        response = client.get(reverse("admin:index"))
        assert response.status_code == 200
