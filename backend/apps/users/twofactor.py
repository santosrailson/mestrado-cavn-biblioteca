"""Views para autenticação de dois fatores (2FA) com TOTP."""

import base64
import secrets

import pyotp
import qrcode
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.audit.services import AuditoriaService
from apps.users.models import TwoFactorRecoveryCode, User
from apps.users.ratelimit import drf_ratelimit
from apps.users.security import CavnRefreshToken, revoke_user_sessions

_ENROLLMENT_SALT = "cavn-digital-2fa-enrollment-v1"
_LOGIN_CHALLENGE_SALT = "cavn-digital-2fa-login-v1"


def has_confirmed_twofactor(user: User) -> bool:
    return TOTPDevice.objects.filter(user=user, confirmed=True).exists()


def issue_enrollment_token(user: User) -> str:
    """Cria um token assinado de curta duração sem emitir uma sessão autenticada."""

    return signing.dumps(
        {
            "user_id": str(user.pk),
            "purpose": "2fa-enrollment",
            "token_version": int(user.auth_token_version),
        },
        salt=_ENROLLMENT_SALT,
    )


def issue_twofactor_challenge(user: User) -> str:
    """Cria o desafio que vincula o segundo fator à senha recém-validada."""

    return signing.dumps(
        {
            "user_id": str(user.pk),
            "purpose": "2fa-login",
            "token_version": int(user.auth_token_version),
        },
        salt=_LOGIN_CHALLENGE_SALT,
    )


def _user_from_enrollment_token(token: str):
    try:
        payload = signing.loads(
            token,
            salt=_ENROLLMENT_SALT,
            max_age=getattr(settings, "TWO_FACTOR_ENROLLMENT_TOKEN_LIFETIME_SECONDS", 600),
        )
        if payload.get("purpose") != "2fa-enrollment":
            return None
        user = User.objects.get(pk=payload.get("user_id"), is_active=True)
        if int(payload.get("token_version", -1)) != int(user.auth_token_version):
            return None
        return user
    except (
        TypeError,
        ValueError,
        signing.BadSignature,
        signing.SignatureExpired,
        User.DoesNotExist,
    ):
        return None


def _user_from_twofactor_challenge(token: str):
    try:
        payload = signing.loads(
            token,
            salt=_LOGIN_CHALLENGE_SALT,
            max_age=getattr(settings, "TWO_FACTOR_LOGIN_CHALLENGE_LIFETIME_SECONDS", 300),
        )
        if payload.get("purpose") != "2fa-login":
            return None
        user = User.objects.get(pk=payload.get("user_id"), is_active=True)
        if int(payload.get("token_version", -1)) != int(user.auth_token_version):
            return None
        return user
    except (
        TypeError,
        ValueError,
        signing.BadSignature,
        signing.SignatureExpired,
        User.DoesNotExist,
    ):
        return None


def _generate_qr_svg(provisioning_uri: str) -> str:
    import xml.etree.ElementTree as ET

    # border=4 é o mínimo exigido pela especificação QR code para leitura confiável
    qr = qrcode.QRCode(border=4, box_size=10)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    matrix = qr.modules
    box = 10
    total = (len(matrix) + 2 * qr.border) * box

    svg = ET.Element(
        "svg",
        {
            "xmlns": "http://www.w3.org/2000/svg",
            "viewBox": f"0 0 {total} {total}",
            "width": "100%",
            "height": "100%",
        },
    )
    ET.SubElement(svg, "rect", {"width": str(total), "height": str(total), "fill": "#ffffff"})
    for y, row in enumerate(matrix):
        for x, module in enumerate(row):
            if module:
                ET.SubElement(
                    svg,
                    "rect",
                    {
                        "x": str((x + qr.border) * box),
                        "y": str((y + qr.border) * box),
                        "width": str(box),
                        "height": str(box),
                        "fill": "#000000",
                    },
                )

    return ET.tostring(svg, encoding="unicode")


def _create_pending_device(user: User) -> dict:
    """Cria dispositivo pendente e retorna apenas material de provisionamento."""

    TOTPDevice.objects.filter(user=user, confirmed=False).delete()
    device = TOTPDevice.objects.create(user=user, name="padrao", confirmed=False)
    key_b32 = base64.b32encode(bytes.fromhex(device.key)).decode("utf-8")
    site_name = getattr(settings, "SITE_NAME", "CAVN Digital")
    uri = pyotp.totp.TOTP(key_b32).provisioning_uri(name=user.email, issuer_name=site_name)
    return {
        "totp_key": key_b32,
        "provisioning_uri": uri,
        "qr_code_svg": _generate_qr_svg(uri),
        "device_id": str(device.pk),
    }


def _new_recovery_code() -> str:
    value = secrets.token_hex(5).upper()
    return f"{value[:5]}-{value[5:]}"


def _replace_recovery_codes(user: User) -> list[str]:
    codes = [
        _new_recovery_code() for _ in range(getattr(settings, "TWO_FACTOR_RECOVERY_CODE_COUNT", 10))
    ]
    with transaction.atomic():
        TwoFactorRecoveryCode.objects.filter(usuario=user).delete()
        TwoFactorRecoveryCode.objects.bulk_create(
            [TwoFactorRecoveryCode(usuario=user, codigo_hash=make_password(code)) for code in codes]
        )
    return codes


def _verify_totp(user: User, token: str, device_id: str | None = None) -> bool:
    devices = TOTPDevice.objects.filter(user=user, confirmed=True)
    if device_id:
        devices = devices.filter(pk=device_id)
    return any(device.verify_token(token) for device in devices)


def _consume_recovery_code(user: User, code: str) -> bool:
    normalized = code.strip().upper()
    if not normalized:
        return False
    with transaction.atomic():
        candidates = TwoFactorRecoveryCode.objects.select_for_update().filter(
            usuario=user, usado_em__isnull=True
        )
        for recovery_code in candidates:
            if check_password(normalized, recovery_code.codigo_hash):
                recovery_code.usado_em = timezone.now()
                recovery_code.save(update_fields=["usado_em"])
                return True
    return False


def _recovery_codes_remaining(user: User) -> int:
    return TwoFactorRecoveryCode.objects.filter(usuario=user, usado_em__isnull=True).count()


def _audit_twofactor(user: User, action: str, request) -> None:
    AuditoriaService.registrar(
        usuario=user,
        acao=action,
        entidade="TwoFactor",
        entidade_id=str(user.pk),
        request=request,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_status", rate="10/m")
def twofactor_status(request):
    """Retorna se o usuário tem 2FA ativo."""
    user: User = request.user
    devices = TOTPDevice.objects.filter(user=user, confirmed=True)
    return Response(
        {
            "twofactor_ativa": devices.exists(),
            "twofactor_obrigatorio": bool(
                getattr(settings, "MANDATORY_2FA_FOR_PRIVILEGED", False) and user.can_catalogue()
            ),
            "codigos_recuperacao_restantes": _recovery_codes_remaining(user),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_setup", rate="5/m")
def twofactor_setup(request):
    """Gera uma nova chave TOTP e retorna URI + QR code para configurar o app.

    Permite configuração para catalogadores, curadores e administradores.
    """
    user: User = request.user
    if not user.can_catalogue():
        return Response(
            {
                "detail": "Apenas usuários com perfil de catalogador ou superior podem configurar 2FA."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response(_create_pending_device(user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_verify_setup", rate="5/m")
def twofactor_verify_setup(request):
    """Confirma a configuração do 2FA verificando um token do authenticator."""
    user: User = request.user
    token = request.data.get("token", "")

    device = TOTPDevice.objects.filter(user=user, confirmed=False).first()
    if not device:
        return Response(
            {"detail": "Nenhum dispositivo pendente de configuração."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if device.verify_token(token):
        device.confirmed = True
        device.save()
        codes = _replace_recovery_codes(user)
        revoke_user_sessions(user)
        _audit_twofactor(user, "ativar", request)
        return Response({"twofactor_ativa": True, "codigos_recuperacao": codes})
    return Response(
        {"detail": "Token inválido. Tente novamente."},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_disable", rate="5/m")
def twofactor_disable(request):
    """Desativa o 2FA para o usuário autenticado."""
    user: User = request.user
    if not user.can_catalogue():
        return Response(status=status.HTTP_403_FORBIDDEN)
    if getattr(settings, "MANDATORY_2FA_FOR_PRIVILEGED", False):
        return Response(
            {"detail": "O 2FA é obrigatório para este perfil e não pode ser desativado."},
            status=status.HTTP_403_FORBIDDEN,
        )

    TOTPDevice.objects.filter(user=user).delete()
    TwoFactorRecoveryCode.objects.filter(usuario=user).delete()
    revoke_user_sessions(user)
    _audit_twofactor(user, "desativar", request)
    return Response({"twofactor_ativa": False})


@api_view(["POST"])
@permission_classes([AllowAny])
@drf_ratelimit(group="twofactor_enroll_setup", rate="5/m")
def twofactor_enroll_setup(request):
    """Inicia o cadastro 2FA usando o token de matrícula emitido no login."""

    user = _user_from_enrollment_token(request.data.get("enrollment_token", ""))
    if user is None or not user.can_catalogue():
        return Response({"detail": "Matrícula 2FA inválida ou expirada."}, status=401)
    return Response(_create_pending_device(user))


@api_view(["POST"])
@permission_classes([AllowAny])
@drf_ratelimit(group="twofactor_enroll_verify", rate="5/m")
def twofactor_enroll_verify(request):
    """Confirma o primeiro fator e encerra o token de matrícula."""

    user = _user_from_enrollment_token(request.data.get("enrollment_token", ""))
    if user is None or not user.can_catalogue():
        return Response({"detail": "Matrícula 2FA inválida ou expirada."}, status=401)

    device = TOTPDevice.objects.filter(
        user=user, confirmed=False, pk=request.data.get("device_id")
    ).first()
    if device is None or not device.verify_token(request.data.get("token", "")):
        return Response({"detail": "Token 2FA inválido."}, status=400)

    device.confirmed = True
    device.save(update_fields=["confirmed"])
    codes = _replace_recovery_codes(user)
    revoke_user_sessions(user)
    _audit_twofactor(user, "ativar", request)
    return Response({"twofactor_ativa": True, "codigos_recuperacao": codes})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@drf_ratelimit(group="twofactor_recovery_rotate", rate="3/h")
def twofactor_recovery_codes_rotate(request):
    """Gera novo conjunto de códigos depois de revalidar o TOTP atual."""

    user: User = request.user
    if not user.can_catalogue() or not _verify_totp(user, request.data.get("token", "")):
        return Response({"detail": "Código 2FA inválido."}, status=401)
    codes = _replace_recovery_codes(user)
    revoke_user_sessions(user)
    _audit_twofactor(user, "rotacionar_codigos", request)
    return Response({"codigos_recuperacao": codes})


@api_view(["POST"])
@permission_classes([AllowAny])
@drf_ratelimit(group="twofactor_login", rate="5/m")
def twofactor_login(request):
    """Segunda etapa do login: verifica o token 2FA e emite cookies JWT.

    Espera o desafio assinado emitido após a senha e um token TOTP ou código de
    recuperação. Sem AllowAny o usuário ainda não tem JWT e o POST seria
    bloqueado pelo IsAuthenticatedOrReadOnly padrão do DRF.
    """
    challenge = request.data.get("twofactor_challenge")
    token = request.data.get("token", "")
    recovery_code = request.data.get("recovery_code", "")

    if not challenge:
        return Response(
            {"detail": "Desafio 2FA é obrigatório."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = _user_from_twofactor_challenge(challenge)
    if user is None:
        return Response(
            {"detail": "Desafio 2FA inválido ou expirado."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.can_catalogue():
        return Response(
            {"detail": "Usuário não possui segundo fator habilitado."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if _verify_totp(user, token) or _consume_recovery_code(user, recovery_code):
        refresh = CavnRefreshToken.for_user(user)
        cookie_secure = getattr(settings, "SESSION_COOKIE_SECURE", False)
        response = Response({"valido": True})
        response.set_cookie(
            "cavn_access",
            str(refresh.access_token),
            max_age=3600,
            httponly=True,
            samesite="Lax",
            secure=cookie_secure,
        )
        response.set_cookie(
            "cavn_refresh",
            str(refresh),
            max_age=7 * 24 * 3600,
            httponly=True,
            samesite="Lax",
            secure=cookie_secure,
        )
        get_token(request)
        _audit_twofactor(user, "login", request)
        return response

    return Response(
        {"detail": "Token 2FA inválido."},
        status=status.HTTP_401_UNAUTHORIZED,
    )
