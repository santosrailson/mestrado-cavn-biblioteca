"""Serializers para autenticação e gestão de usuários."""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import PrivacyRequest, User


class UserSerializer(serializers.ModelSerializer):
    """Serializer de leitura para usuários."""

    nome = serializers.SerializerMethodField()
    perfil = serializers.CharField(source="role", read_only=True)
    perfis = serializers.SerializerMethodField()
    ativo = serializers.BooleanField(source="is_active", read_only=True)
    ultimoAcesso = serializers.DateTimeField(source="last_login", read_only=True)
    createdAt = serializers.DateTimeField(source="date_joined", read_only=True)
    updatedAt = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "nome",
            "role",
            "perfil",
            "perfis",
            "institution",
            "bio",
            "avatar",
            "ativo",
            "ultimoAcesso",
            "createdAt",
            "updatedAt",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def get_nome(self, obj):
        return obj.get_full_name() or obj.email

    def get_perfis(self, obj):
        return [obj.role]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de usuários via painel administrativo."""

    nome = serializers.CharField(write_only=True)
    perfil = serializers.CharField(source="role", write_only=True)
    senha = serializers.CharField(
        source="password", write_only=True, validators=[validate_password]
    )
    username = serializers.CharField(required=False, allow_blank=True)
    ativo = serializers.BooleanField(source="is_active", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "nome",
            "perfil",
            "senha",
            "ativo",
            "institution",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        email = attrs.get("email", "")
        if not attrs.get("username"):
            base = email.split("@")[0] or "usuario"
            username = base
            count = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{count}"
                count += 1
            attrs["username"] = username
        return attrs

    def create(self, validated_data):
        nome = validated_data.pop("nome", "")
        partes = nome.split(" ", 1)
        validated_data["first_name"] = partes[0]
        validated_data["last_name"] = partes[1] if len(partes) > 1 else ""
        return User.objects.create_user(**validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de usuários via painel administrativo."""

    nome = serializers.CharField(required=False, write_only=True)
    perfil = serializers.CharField(source="role", required=False, write_only=True)
    senha = serializers.CharField(
        source="password",
        write_only=True,
        required=False,
        allow_blank=True,
        validators=[validate_password],
    )
    ativo = serializers.BooleanField(source="is_active", required=False)

    class Meta:
        model = User
        fields = [
            "email",
            "nome",
            "perfil",
            "senha",
            "ativo",
            "institution",
            "bio",
        ]

    def update(self, instance, validated_data):
        nome = validated_data.pop("nome", None)
        if nome is not None:
            partes = nome.split(" ", 1)
            instance.first_name = partes[0]
            instance.last_name = partes[1] if len(partes) > 1 else ""

        senha = validated_data.pop("password", None)
        if senha:
            instance.set_password(senha)

        return super().update(instance, validated_data)


class PrivacyRequestSerializer(serializers.ModelSerializer):
    """Serializer de solicitações LGPD do titular e do administrador."""

    tipoLabel = serializers.CharField(source="get_tipo_display", read_only=True)
    statusLabel = serializers.CharField(source="get_status_display", read_only=True)
    criadoEm = serializers.DateTimeField(source="criado_em", read_only=True)
    atualizadoEm = serializers.DateTimeField(source="atualizado_em", read_only=True)
    resolvidoEm = serializers.DateTimeField(source="resolvido_em", read_only=True)

    class Meta:
        model = PrivacyRequest
        fields = [
            "id",
            "tipo",
            "tipoLabel",
            "descricao",
            "status",
            "statusLabel",
            "resposta",
            "criadoEm",
            "atualizadoEm",
            "resolvidoEm",
        ]
        read_only_fields = ["id", "status", "resposta", "criadoEm", "atualizadoEm", "resolvidoEm"]

    def validate_descricao(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError(
                "Descreva a solicitação com pelo menos 10 caracteres."
            )
        return value
