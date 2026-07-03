"""Validadores de segurança para uploads de arquivos."""

import mimetypes
import os
import zipfile

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

# Extensões permitidas por categoria de risco.
# Evita uploads de executáveis, scripts e outros arquivos perigosos.
ALLOWED_EXTENSIONS = {
    # Documentos
    ".pdf",
    ".doc",
    ".docx",
    ".odt",
    ".rtf",
    ".txt",
    # Planilhas
    ".xls",
    ".xlsx",
    ".ods",
    ".csv",
    # Apresentações
    ".ppt",
    ".pptx",
    ".odp",
    # Imagens
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".tiff",
    ".tif",
    ".bmp",
    # Áudio/Vídeo
    ".mp3",
    ".mp4",
    ".ogg",
    ".ogv",
    ".webm",
    ".wav",
    # Arquivos compactados
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
}

ARCHIVE_EXTENSIONS = {".zip", ".rar", ".7z", ".tar", ".gz"}

# MIME types bloqueados independentemente da extensão
BLOCKED_MIME_TYPES = {
    "application/x-msdownload",
    "application/x-exe",
    "application/x-dosexec",
    "application/x-executable",
    "application/x-sh",
    "application/x-shellscript",
    "application/javascript",
    "text/javascript",
    "text/html",
    "application/xhtml+xml",
    "application/x-httpd-php",
}


def validate_file_extension(file):
    """Valida se a extensão do arquivo está na lista de permitidas."""
    ext = os.path.splitext(file.name)[1].lower()
    if not ext:
        raise ValidationError(
            _("O arquivo não possui extensão. Envie um arquivo com extensão conhecida.")
        )
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            _(
                "Extensão %(ext)s não permitida. "
                "Envie apenas documentos, imagens, áudio, vídeo ou arquivos compactados."
            ),
            params={"ext": ext},
        )
    allow_archives = getattr(settings, "ALLOW_ARCHIVE_UPLOADS", True)
    if ext in ARCHIVE_EXTENSIONS and not allow_archives:
        raise ValidationError(
            _("Uploads de arquivos compactados estão desabilitados neste ambiente.")
        )


def validate_file_mime_type(file):
    """Valida o MIME type detectado pelo python-magic, se disponível."""
    try:
        import magic

        file.seek(0)
        mime = magic.from_buffer(file.read(2048), mime=True)
        file.seek(0)
    except Exception:
        # Fallback para mimetypes do Python quando python-magic não estiver disponível
        mime, _ = mimetypes.guess_type(file.name)

    if mime and mime.lower() in BLOCKED_MIME_TYPES:
        raise ValidationError(
            _(
                "Tipo de arquivo %(mime)s não é permitido por questões de segurança."
            ),
            params={"mime": mime},
        )


def validate_file_size(file):
    """Valida o tamanho máximo do upload."""
    max_size = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 104857600)  # 100 MB padrão
    if file.size > max_size:
        raise ValidationError(
            _(
                "O arquivo excede o tamanho máximo permitido de %(max_size)s bytes."
            ),
            params={"max_size": max_size},
        )


def validate_archive_safety(file):
    """Aplica proteções básicas contra ZIP bomb e path traversal."""
    ext = os.path.splitext(file.name)[1].lower()
    if ext != ".zip":
        return

    max_entries = getattr(settings, "MAX_ZIP_ENTRIES", 1000)
    max_uncompressed_size = getattr(
        settings,
        "MAX_ZIP_UNCOMPRESSED_SIZE_BYTES",
        getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 104857600) * 3,
    )
    max_compression_ratio = getattr(settings, "MAX_ZIP_COMPRESSION_RATIO", 100)

    try:
        file.seek(0)
        with zipfile.ZipFile(file) as archive:
            infos = archive.infolist()
            if len(infos) > max_entries:
                raise ValidationError(
                    _("Arquivo ZIP contém itens demais para processamento seguro.")
                )

            total_uncompressed = 0
            total_compressed = 0
            for info in infos:
                normalized = os.path.normpath(info.filename)
                if normalized.startswith("..") or os.path.isabs(normalized):
                    raise ValidationError(
                        _("Arquivo ZIP contém caminho inseguro.")
                    )
                total_uncompressed += info.file_size
                total_compressed += max(info.compress_size, 1)

            if total_uncompressed > max_uncompressed_size:
                raise ValidationError(
                    _("Arquivo ZIP excede o tamanho descompactado permitido.")
                )

            if infos and total_uncompressed / total_compressed > max_compression_ratio:
                raise ValidationError(
                    _("Arquivo ZIP possui taxa de compressão suspeita.")
                )
    except zipfile.BadZipFile as exc:
        raise ValidationError(_("Arquivo ZIP inválido ou corrompido.")) from exc
    finally:
        try:
            file.seek(0)
        except Exception:
            pass


def validate_upload(file):
    """Executa todas as validações de segurança em um upload."""
    if file is None:
        return
    validate_file_extension(file)
    validate_file_mime_type(file)
    validate_file_size(file)
    validate_archive_safety(file)
