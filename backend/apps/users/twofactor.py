"""Views para autenticação de dois fatores (2FA) com TOTP."""

import base64
import io

import pyotp
import qrcode
from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.timezone import now
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.users.models import User


def _generate_qr_svg(provisioning_uri: str) -> str:
    import xml.etree.ElementTree as ET

    # border=4 é o mínimo exigido pela especificação QR code para leitura confiável
    qr = qrcode.QRCode(border=4, box_size=10)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    matrix = qr.modules
    box = 10
    total = (len(matrix) + 2 * qr.border) * box

    svg = ET.Element("svg", {
        "xmlns": "http://www.w3.org/2000/svg",
        "viewBox": f"0 0 {total} {total}",
        "width": "100%",
        "height": "100%",
    })
    ET.SubElement(svg, "rect", {"width": str(total), "height": str(total), "fill": "#ffffff"})
    for y, row in enumerate(matrix):
        for x, module in enumerate(row):
            if module:
                ET.SubElement(svg, "rect", {
                    "x": str((x + qr.border) * box),
                    "y": str((y + qr.border) * box),
                    "width": str(box),
                    "height": str(box),
                    "fill": "#000000",
                })

    return ET.tostring(svg, encoding="unicode")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def twofactor_status(request):
    """Retorna se o usuário tem 2FA ativo."""
    user: User = request.user
    devices = TOTPDevice.objects.filter(user=user, confirmed=True)
    return Response({"twofactor_ativa": devices.exists()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def twofactor_setup(request):
    """Gera uma nova chave TOTP e retorna URI + QR code para configurar o app.

    Permite configuração para catalogadores, curadores e administradores.
    """
    user: User = request.user
    if not user.can_catalogue():
        return Response(
            {"detail": "Apenas usuários com perfil de catalogador ou superior podem configurar 2FA."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Remove dispositivos não confirmados anteriores
    TOTPDevice.objects.filter(user=user, confirmed=False).delete()

    device = TOTPDevice.objects.create(
        user=user,
        name="padrao",
        confirmed=False,
    )
    # django-otp armazena a chave em hex; pyotp espera base32
    key_b32 = base64.b32encode(bytes.fromhex(device.key)).decode("utf-8")
    site_name = getattr(settings, "SITE_NAME", "CAVN Digital")
    uri = pyotp.totp.TOTP(key_b32).provisioning_uri(
        name=user.email,
        issuer_name=site_name,
    )
    qr_svg = _generate_qr_svg(uri)

    return Response({
        "totp_key": key_b32,
        "provisioning_uri": uri,
        "qr_code_svg": qr_svg,
        "device_id": str(device.pk),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
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
        return Response({"twofactor_ativa": True})
    return Response(
        {"detail": "Token inválido. Tente novamente."},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def twofactor_disable(request):
    """Desativa o 2FA para o usuário autenticado."""
    user: User = request.user
    if not user.can_catalogue():
        return Response(status=status.HTTP_403_FORBIDDEN)

    TOTPDevice.objects.filter(user=user).delete()
    return Response({"twofactor_ativa": False})


@api_view(["POST"])
@permission_classes([AllowAny])
def twofactor_login(request):
    """Segunda etapa do login: verifica o token 2FA e emite cookies JWT.

    Espera 'user_id' e 'token' no body. O user_id é obtido na primeira etapa
    (login tradicional). Sem AllowAny o usuário ainda não tem JWT e o POST seria
    bloqueado pelo IsAuthenticatedOrReadOnly padrão do DRF.
    """
    from rest_framework_simplejwt.tokens import RefreshToken

    user_id = request.data.get("user_id")
    token = request.data.get("token", "")

    if not user_id:
        return Response(
            {"detail": "user_id é obrigatório."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "Usuário não encontrado."},
            status=status.HTTP_404_NOT_FOUND,
        )

    devices = TOTPDevice.objects.filter(user=user, confirmed=True)
    for device in devices:
        if device.verify_token(token):
            refresh = RefreshToken.for_user(user)
            cookie_secure = getattr(settings, "SESSION_COOKIE_SECURE", False)
            response = Response({"valido": True})
            response.set_cookie(
                "cavn_access", str(refresh.access_token),
                max_age=3600, httponly=True, samesite="Lax", secure=cookie_secure,
            )
            response.set_cookie(
                "cavn_refresh", str(refresh),
                max_age=7 * 24 * 3600, httponly=True, samesite="Lax", secure=cookie_secure,
            )
            get_token(request)
            return response

    return Response(
        {"detail": "Token 2FA inválido."},
        status=status.HTTP_401_UNAUTHORIZED,
    )
