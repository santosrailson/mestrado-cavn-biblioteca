"""Constantes compartilhadas do projeto."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class UserRole(models.TextChoices):
    VISITOR = "visitante", _("Visitante")
    CATALOGUER = "catalogador", _("Catalogador")
    CURATOR = "curador", _("Curador")
    ADMINISTRATOR = "administrador", _("Administrador")


class DocumentStatus(models.TextChoices):
    DRAFT = "rascunho", _("Rascunho")
    UNDER_REVIEW = "em_revisao", _("Em revisão")
    APPROVED = "aprovado", _("Aprovado")
    REJECTED = "rejeitado", _("Rejeitado")
    PUBLISHED = "publicado", _("Publicado")
    ARCHIVED = "arquivado", _("Arquivado")


class DatePrecision(models.TextChoices):
    EXACT = "dia", _("Dia exato")
    MONTH = "mes", _("Mês")
    YEAR = "ano", _("Ano")
    DECADE = "decada", _("Década")
    CENTURY = "seculo", _("Século")
    UNKNOWN = "desconhecida", _("Desconhecida")


class FileType(models.TextChoices):
    ORIGINAL = "original", _("Original")
    THUMBNAIL = "thumbnail", _("Thumbnail")
    OCR_TEXT = "ocr_text", _("Texto OCR")
    WATERMARK = "watermark", _("Marca d'água")


class AuditAction(models.TextChoices):
    CREATE = "criar", _("Criar")
    UPDATE = "atualizar", _("Atualizar")
    DELETE = "excluir", _("Excluir")
    LOGIN = "login", _("Login")
    LOGOUT = "logout", _("Logout")
    APPROVE = "aprovar", _("Aprovar")
    REJECT = "rejeitar", _("Rejeitar")
    SUBMIT = "submeter", _("Submeter")
    ARCHIVE = "arquivar", _("Arquivar")
