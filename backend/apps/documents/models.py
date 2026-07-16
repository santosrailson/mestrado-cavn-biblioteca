"""Modelos de documentos, arquivos, autores e relacionamentos."""

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.constants import (
    AntivirusStatus,
    DatePrecision,
    DocumentStatus,
    FileType,
    ProcessingStatus,
)
from apps.core.models import BaseModel
from apps.core.utils import generate_unique_slug
from apps.core.validators import validate_upload


class Autor(BaseModel):
    """Autor ou entidade responsável pela criação do documento."""

    nome = models.CharField(max_length=255, verbose_name=_("Nome"))
    biografia = models.TextField(blank=True, verbose_name=_("Biografia"))
    data_nascimento = models.DateField(null=True, blank=True, verbose_name=_("Data de nascimento"))
    data_falecimento = models.DateField(
        null=True, blank=True, verbose_name=_("Data de falecimento")
    )

    class Meta:
        verbose_name = _("Autor")
        verbose_name_plural = _("Autores")
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["nome"], name="autor_nome_idx"),
        ]

    def __str__(self):
        return self.nome


class Document(BaseModel):
    """Documento do acervo com metadados Dublin Core e workflow."""

    # Identificação
    titulo = models.CharField(max_length=500, verbose_name=_("Título"))
    titulo_alternativo = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("Título alternativo"),
    )
    slug = models.SlugField(unique=True, max_length=500, verbose_name=_("Slug"))

    # Metadados descritivos
    descricao = models.TextField(blank=True, verbose_name=_("Descrição"))
    resumo = models.TextField(blank=True, verbose_name=_("Resumo"))

    # Metadados arquivísticos
    codigo_referencia = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Código de referência"),
    )
    tipo_documento = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Tipo de documento"),
    )
    data_documento = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Data do documento"),
    )
    data_precisao = models.CharField(
        max_length=20,
        choices=DatePrecision.choices,
        default=DatePrecision.UNKNOWN,
        verbose_name=_("Precisão da data"),
    )
    cobertura_temporal = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Cobertura temporal"),
    )
    cobertura_espacial = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Cobertura espacial"),
    )
    idioma = models.CharField(
        max_length=50,
        default="pt-BR",
        verbose_name=_("Idioma"),
    )
    direitos = models.TextField(
        blank=True,
        verbose_name=_("Direitos"),
    )
    fonte = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("Fonte"),
    )
    relacao = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("Relação"),
    )

    # Workflow e auditoria
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
        verbose_name=_("Status"),
    )
    aprovado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documentos_aprovados",
        verbose_name=_("Aprovado por"),
    )
    data_aprovacao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Data de aprovação"),
    )
    motivo_rejeicao = models.TextField(
        blank=True,
        verbose_name=_("Motivo da rejeição"),
    )

    # Soft delete
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Excluído em"),
    )

    # Relacionamentos N:N
    autores = models.ManyToManyField(
        Autor,
        through="DocumentoAutor",
        related_name="documentos",
        verbose_name=_("Autores"),
    )
    categorias = models.ManyToManyField(
        "categories.Categoria",
        through="DocumentoCategoria",
        related_name="documentos",
        verbose_name=_("Categorias"),
    )
    tags = models.ManyToManyField(
        "tags.Tag",
        through="DocumentoTag",
        related_name="documentos",
        verbose_name=_("Tags"),
    )

    search_vector = SearchVectorField(blank=True, null=True, verbose_name=_("Vetor de busca"))

    class Meta:
        verbose_name = _("Documento")
        verbose_name_plural = _("Documentos")
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "deleted_at", "-created_at"], name="documents_pub_created_idx"
            ),
            models.Index(fields=["slug"]),
            models.Index(fields=["tipo_documento"]),
            models.Index(fields=["data_documento"]),
            GinIndex(fields=["search_vector"], name="documents_search_vector_gin"),
        ]

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Document, self.titulo)
        super().save(*args, **kwargs)

    @property
    def is_public(self):
        return self.status == DocumentStatus.PUBLISHED and self.deleted_at is None


class Arquivo(BaseModel):
    """Arquivo digital anexado a um documento."""

    documento = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="arquivos",
        verbose_name=_("Documento"),
    )
    nome_original = models.CharField(
        max_length=500,
        verbose_name=_("Nome original"),
    )
    nome_armazenado = models.CharField(
        max_length=500,
        verbose_name=_("Nome armazenado"),
    )
    arquivo = models.FileField(
        upload_to="documentos/%Y/%m/",
        validators=[validate_upload],
        verbose_name=_("Arquivo"),
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Tipo MIME"),
    )
    tamanho_bytes = models.PositiveBigIntegerField(
        default=0,
        verbose_name=_("Tamanho em bytes"),
    )
    checksum_sha256 = models.CharField(
        max_length=64,
        blank=True,
        verbose_name=_("Checksum SHA-256"),
    )
    largura = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Largura"),
    )
    altura = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Altura"),
    )
    tipo_arquivo = models.CharField(
        max_length=20,
        choices=FileType.choices,
        default=FileType.ORIGINAL,
        verbose_name=_("Tipo de arquivo"),
    )
    processado_ocr = models.BooleanField(
        default=False,
        verbose_name=_("Processado OCR"),
    )
    conteudo_ocr = models.TextField(
        blank=True,
        verbose_name=_("Conteúdo OCR"),
    )
    processamento_status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING,
        verbose_name=_("Status do processamento"),
    )
    processamento_etapa = models.CharField(
        max_length=40,
        blank=True,
        verbose_name=_("Etapa do processamento"),
    )
    processamento_progresso = models.PositiveSmallIntegerField(
        default=0,
        verbose_name=_("Progresso do processamento"),
    )
    processamento_erro = models.TextField(
        blank=True,
        verbose_name=_("Erro do processamento"),
    )
    antivirus_status = models.CharField(
        max_length=20,
        choices=AntivirusStatus.choices,
        default=AntivirusStatus.PENDING,
        verbose_name=_("Status do antivírus"),
    )
    antivirus_escaneado_em = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Escaneado em"),
    )
    antivirus_diagnostico = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("Diagnóstico do antivírus"),
    )

    class Meta:
        verbose_name = _("Arquivo")
        verbose_name_plural = _("Arquivos")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["documento", "tipo_arquivo"], name="arquivo_doc_tipo_idx"),
        ]

    def __str__(self):
        return self.nome_original


class DocumentoAutor(BaseModel):
    """Relacionamento N:N entre Documento e Autor com tipo de autoria."""

    documento = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="documento_autores",
        verbose_name=_("Documento"),
    )
    autor = models.ForeignKey(
        Autor,
        on_delete=models.CASCADE,
        related_name="autor_documentos",
        verbose_name=_("Autor"),
    )
    tipo_autoria = models.CharField(
        max_length=100,
        default="autor",
        verbose_name=_("Tipo de autoria"),
    )

    class Meta:
        verbose_name = _("Autoria")
        verbose_name_plural = _("Autorias")
        unique_together = [["documento", "autor", "tipo_autoria"]]


class DocumentoCategoria(BaseModel):
    """Relacionamento N:N entre Documento e Categoria."""

    documento = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="documento_categorias",
        verbose_name=_("Documento"),
    )
    categoria = models.ForeignKey(
        "categories.Categoria",
        on_delete=models.CASCADE,
        related_name="categoria_documentos",
        verbose_name=_("Categoria"),
    )

    class Meta:
        verbose_name = _("Vínculo categoria")
        verbose_name_plural = _("Vínculos categoria")
        unique_together = [["documento", "categoria"]]


class DocumentoTag(BaseModel):
    """Relacionamento N:N entre Documento e Tag."""

    documento = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="documento_tags",
        verbose_name=_("Documento"),
    )
    tag = models.ForeignKey(
        "tags.Tag",
        on_delete=models.CASCADE,
        related_name="tag_documentos",
        verbose_name=_("Tag"),
    )

    class Meta:
        verbose_name = _("Vínculo tag")
        verbose_name_plural = _("Vínculos tag")
        unique_together = [["documento", "tag"]]


class DocumentoRelacionado(BaseModel):
    """Relacionamento N:N entre documentos com tipo de relação."""

    documento_origem = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="relacionamentos_origem",
        verbose_name=_("Documento de origem"),
    )
    documento_destino = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="relacionamentos_destino",
        verbose_name=_("Documento relacionado"),
    )
    tipo_relacao = models.CharField(
        max_length=100,
        default="relacionado",
        verbose_name=_("Tipo de relação"),
    )

    class Meta:
        verbose_name = _("Documento relacionado")
        verbose_name_plural = _("Documentos relacionados")
        unique_together = [["documento_origem", "documento_destino", "tipo_relacao"]]
        indexes = [
            models.Index(fields=["documento_origem"], name="doc_rel_origem_idx"),
        ]
