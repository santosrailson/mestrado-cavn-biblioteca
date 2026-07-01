import pyotp
import pytest
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


def _token(device: TOTPDevice) -> str:
    from binascii import unhexlify
    import base64
    raw_key = unhexlify(device.key.encode())
    b32_key = base64.b32encode(raw_key).decode()
    return pyotp.TOTP(b32_key).now()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestTwoFactorAuth:
    def test_status_returns_false_when_not_configured(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/auth/2fa/status/")
        assert response.status_code == 200
        assert response.data["twofactor_ativa"] is False

    def test_visitor_cannot_setup_2fa(self, api_client):
        user = UserFactory(role=UserRole.VISITOR)
        api_client.force_authenticate(user=user)
        response = api_client.post("/api/v1/auth/2fa/setup/")
        assert response.status_code == 403

    def test_cataloguer_can_setup_2fa(self, api_client):
        """Catalogadores também podem configurar 2FA para maior segurança."""
        user = UserFactory(role=UserRole.CATALOGUER)
        api_client.force_authenticate(user=user)
        response = api_client.post("/api/v1/auth/2fa/setup/")
        assert response.status_code == 200
        assert "provisioning_uri" in response.data

    def test_admin_can_setup_2fa(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=user)
        response = api_client.post("/api/v1/auth/2fa/setup/")
        assert response.status_code == 200
        assert "provisioning_uri" in response.data
        assert "qr_code_svg" in response.data
        assert "device_id" in response.data

    def test_curator_can_setup_2fa(self, api_client):
        user = UserFactory(role=UserRole.CURATOR)
        api_client.force_authenticate(user=user)
        response = api_client.post("/api/v1/auth/2fa/setup/")
        assert response.status_code == 200

    def test_verify_setup_with_valid_token(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=user)

        setup_resp = api_client.post("/api/v1/auth/2fa/setup/")
        assert setup_resp.status_code == 200
        device = TOTPDevice.objects.get(pk=setup_resp.data["device_id"])

        verify_resp = api_client.post("/api/v1/auth/2fa/verify-setup/", {"token": _token(device)})
        assert verify_resp.status_code == 200
        assert verify_resp.data["twofactor_ativa"] is True

        device.refresh_from_db()
        assert device.confirmed is True

    def test_verify_setup_with_invalid_token(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=user)

        api_client.post("/api/v1/auth/2fa/setup/")
        verify_resp = api_client.post("/api/v1/auth/2fa/verify-setup/", {"token": "000000"})
        assert verify_resp.status_code == 400

    def test_disable_2fa(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=user)

        setup_resp = api_client.post("/api/v1/auth/2fa/setup/")
        device = TOTPDevice.objects.get(pk=setup_resp.data["device_id"])
        api_client.post("/api/v1/auth/2fa/verify-setup/", {"token": _token(device)})

        response = api_client.post("/api/v1/auth/2fa/disable/")
        assert response.status_code == 200
        assert response.data["twofactor_ativa"] is False
        assert TOTPDevice.objects.filter(user=user).count() == 0

    def test_status_returns_true_after_setup(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        api_client.force_authenticate(user=user)

        resp = api_client.post("/api/v1/auth/2fa/setup/")
        device = TOTPDevice.objects.get(pk=resp.data["device_id"])
        api_client.post("/api/v1/auth/2fa/verify-setup/", {"token": _token(device)})

        resp2 = api_client.get("/api/v1/auth/2fa/status/")
        assert resp2.data["twofactor_ativa"] is True
