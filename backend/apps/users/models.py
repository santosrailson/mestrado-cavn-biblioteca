"""Modelos de usuários customizados com perfis de acesso e privacidade."""

import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.constants import UserRole


class UserManager(BaseUserManager):
    """Manager customizado com helpers por perfil."""

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMINISTRATOR)
        return self.create_user(email, username, password, **extra_fields)

    def administrators(self):
        return self.filter(role=UserRole.ADMINISTRATOR)

    def curators(self):
        return self.filter(role=UserRole.CURATOR)

    def cataloguers(self):
        return self.filter(role=UserRole.CATALOGUER)


class User(AbstractUser):
    """Usuário do sistema com perfis específicos do repositório."""

    email = models.EmailField(unique=True, verbose_name=_("E-mail"))
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VISITOR,
        verbose_name=_("Perfil"),
    )
    is_active = models.BooleanField(default=True, verbose_name=_("Ativo"))
    institution = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Instituição"),
    )
    bio = models.TextField(blank=True, verbose_name=_("Biografia"))
    avatar = models.ImageField(
        upload_to="users/avatars/%Y/%m/",
        blank=True,
        null=True,
        verbose_name=_("Avatar"),
    )
    auth_token_version = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Versão dos tokens de autenticação"),
        help_text=_("Incrementada para revogar imediatamente todas as sessões ativas."),
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    objects = UserManager()

    class Meta:
        verbose_name = _("Usuário")
        verbose_name_plural = _("Usuários")
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name() or self.email} ({self.get_role_display()})"

    @property
    def is_visitor(self):
        return self.role == UserRole.VISITOR

    @property
    def is_cataloguer(self):
        return self.role == UserRole.CATALOGUER

    @property
    def is_curator(self):
        return self.role == UserRole.CURATOR

    @property
    def is_administrator(self):
        return self.role == UserRole.ADMINISTRATOR or self.is_superuser

    def can_moderate(self):
        return self.is_curator or self.is_administrator

    def can_catalogue(self):
        return self.is_cataloguer or self.is_curator or self.is_administrator

    def can_administer(self):
        return self.is_administrator


class SolicitacaoAlteracaoSenha(models.Model):
    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        APROVADA = "aprovada", "Aprovada"
        REJEITADA = "rejeitada", "Rejeitada"

    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="solicitacoes_senha",
        verbose_name=_("Usuário"),
    )
    senha_hash = models.CharField(max_length=256, verbose_name=_("Senha (hash)"))
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDENTE,
        verbose_name=_("Status"),
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("Criado em"))
    resolvido_em = models.DateTimeField(null=True, blank=True, verbose_name=_("Resolvido em"))
    resolvido_por = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="solicitacoes_resolvidas",
        verbose_name=_("Resolvido por"),
    )

    class Meta:
        verbose_name = _("Solicitação de Alteração de Senha")
        verbose_name_plural = _("Solicitações de Alteração de Senha")
        ordering = ["-criado_em"]

    def __str__(self):
        return f"Solicitação de {self.usuario.email} ({self.status})"


class PrivacyRequest(models.Model):
    """Solicitação rastreável de exercício de direitos do titular."""

    class RequestType(models.TextChoices):
        ACCESS = "acesso", "Confirmação e acesso"
        RECTIFICATION = "correcao", "Correção de dados"
        DELETION = "eliminacao", "Eliminação, quando aplicável"
        PORTABILITY = "portabilidade", "Portabilidade"
        OBJECTION = "oposicao", "Oposição ao tratamento"
        CONSENT = "consentimento", "Revogação de consentimento"

    class Status(models.TextChoices):
        PENDING = "pendente", "Pendente"
        IN_REVIEW = "em_analise", "Em análise"
        COMPLETED = "concluida", "Concluída"
        REJECTED = "rejeitada", "Rejeitada"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="privacy_requests",
        verbose_name=_("Titular"),
    )
    tipo = models.CharField(max_length=20, choices=RequestType.choices, verbose_name=_("Tipo"))
    descricao = models.TextField(max_length=4000, verbose_name=_("Descrição"))
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name=_("Status")
    )
    resposta = models.TextField(blank=True, verbose_name=_("Resposta"))
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("Criado em"))
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name=_("Atualizado em"))
    resolvido_em = models.DateTimeField(null=True, blank=True, verbose_name=_("Resolvido em"))
    resolvido_por = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="privacy_requests_resolved",
        verbose_name=_("Resolvido por"),
    )
    prazo_em = models.DateTimeField(null=True, blank=True, verbose_name=_("Prazo interno"))
    base_legal = models.CharField(max_length=160, blank=True, verbose_name=_("Base legal"))
    responsavel = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="privacy_requests_assigned",
        verbose_name=_("Responsável"),
    )
    decisao_motivo = models.TextField(blank=True, verbose_name=_("Motivo da decisão"))

    class Meta:
        verbose_name = _("Solicitação de privacidade")
        verbose_name_plural = _("Solicitações de privacidade")
        ordering = ["-criado_em"]
        indexes = [models.Index(fields=["usuario", "status"], name="privacy_user_status_idx")]

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.usuario.email}"


class TwoFactorRecoveryCode(models.Model):
    """Código de recuperação de uso único para o segundo fator."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="twofactor_recovery_codes",
        verbose_name=_("Usuário"),
    )
    codigo_hash = models.CharField(max_length=256, verbose_name=_("Hash do código"))
    usado_em = models.DateTimeField(null=True, blank=True, verbose_name=_("Usado em"))
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name=_("Criado em"))

    class Meta:
        verbose_name = _("Código de recuperação 2FA")
        verbose_name_plural = _("Códigos de recuperação 2FA")
        ordering = ["criado_em"]
        indexes = [
            models.Index(fields=["usuario", "usado_em"], name="twofactor_recovery_active_idx"),
        ]

    def __str__(self):
        status = "usado" if self.usado_em else "disponível"
        return f"Código 2FA de {self.usuario.email} ({status})"
