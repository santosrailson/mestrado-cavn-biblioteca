import pyotp
import pytest
from django.core.cache import cache, caches
from django.test import override_settings
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

from apps.core.constants import UserRole
from apps.users.tests.factories import UserFactory


def _token(device: TOTPDevice) -> str:
    import base64
    from binascii import unhexlify

    raw_key = unhexlify(device.key.encode())
    b32_key = base64.b32encode(raw_key).decode()
    return pyotp.TOTP(b32_key).now()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_rate_limit_cache():
    """Isola os cenários de 2FA dos limites de tentativas de outros testes."""
    cache.clear()
    caches["axes"].clear()


@pytest.mark.django_db
class TestTwoFactorAuth:
    @pytest.mark.django_db
    @override_settings(MANDATORY_2FA_FOR_PRIVILEGED=True)
    def test_login_exige_matricula_2fa_antes_de_emitir_jwt(self, api_client):
        user = UserFactory(role=UserRole.ADMINISTRATOR)
        user.set_password("password")
        user.save(update_fields=["password"])
        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": "password"},
        )
        assert response.status_code == 200
        assert response.data["twofactor_setup_required"] is True
        assert "cavn_access" not in response.cookies

        enrollment_token = response.data["enrollment_token"]
        setup = api_client.post(
            "/api/v1/auth/2fa/enroll/setup/",
            {"enrollment_token": enrollment_token},
        )
        assert setup.status_code == 200
        device = TOTPDevice.objects.get(pk=setup.data["device_id"])
        verified = api_client.post(
            "/api/v1/auth/2fa/enroll/verify/",
            {
                "enrollment_token": enrollment_token,
                "device_id": str(device.pk),
                "token": _token(device),
            },
        )
        assert verified.status_code == 200
        assert len(verified.data["codigos_recuperacao"]) == 10

        second_login = api_client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": "password"},
        )
        assert second_login.data["twofactor_required"] is True
        challenge = second_login.data["twofactor_challenge"]
        assert "user_id" not in second_login.data

        without_password_challenge = api_client.post(
            "/api/v1/auth/2fa/login/",
            {"user_id": str(user.pk), "token": _token(device)},
        )
        assert without_password_challenge.status_code == 401

        # O django-otp impede o replay do mesmo intervalo TOTP usado no cadastro.
        device.refresh_from_db()
        device.last_t = 0
        device.save(update_fields=["last_t"])

        completed = api_client.post(
            "/api/v1/auth/2fa/login/",
            {"twofactor_challenge": challenge, "token": _token(device)},
        )
        assert completed.status_code == 200
        assert completed.cookies["cavn_access"].value

    @pytest.mark.django_db
    @override_settings(MANDATORY_2FA_FOR_PRIVILEGED=True)
    def test_codigo_de_recuperacao_e_de_uso_unico(self, api_client):
        user = UserFactory(role=UserRole.CURATOR)
        user.set_password("password")
        user.save(update_fields=["password"])
        api_client.force_authenticate(user=user)
        setup = api_client.post("/api/v1/auth/2fa/setup/")
        device = TOTPDevice.objects.get(pk=setup.data["device_id"])
        verified = api_client.post("/api/v1/auth/2fa/verify-setup/", {"token": _token(device)})
        recovery_code = verified.data["codigos_recuperacao"][0]
        api_client.force_authenticate(user=None)

        login = api_client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": "password"},
        )
        challenge = login.data["twofactor_challenge"]

        first = api_client.post(
            "/api/v1/auth/2fa/login/",
            {"twofactor_challenge": challenge, "recovery_code": recovery_code},
        )
        assert first.status_code == 200
        second = api_client.post(
            "/api/v1/auth/2fa/login/",
            {"twofactor_challenge": challenge, "recovery_code": recovery_code},
        )
        assert second.status_code == 401

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
