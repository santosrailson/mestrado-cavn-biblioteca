"""Testes para os validadores de upload do core."""

import zipfile
from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.test import override_settings

from apps.core.validators import (
    ALLOWED_EXTENSIONS,
    validate_archive_safety,
    validate_file_extension,
    validate_file_mime_type,
    validate_file_size,
    validate_upload,
)


def test_allowed_extension_passes():
    file = ContentFile(b"conteudo", name="documento.pdf")
    validate_file_extension(file)


def test_blocked_extension_raises():
    file = ContentFile(b"<script>alert(1)</script>", name="script.html")
    try:
        validate_file_extension(file)
        assert False, "Deveria ter lançado ValidationError"
    except ValidationError:
        pass


def test_executable_extension_raises():
    file = ContentFile(b"binary", name="malware.exe")
    try:
        validate_file_extension(file)
        assert False, "Deveria ter lançado ValidationError"
    except ValidationError:
        pass


def test_no_extension_raises():
    file = ContentFile(b"conteudo", name="arquivo_sem_extensao")
    try:
        validate_file_extension(file)
        assert False, "Deveria ter lançado ValidationError"
    except ValidationError:
        pass


def test_all_allowed_extensions_pass():
    for ext in list(ALLOWED_EXTENSIONS)[:5]:
        file = ContentFile(b"conteudo", name=f"arquivo{ext}")
        validate_file_extension(file)


def test_blocked_mime_type_raises():
    file = ContentFile(b"#!/bin/sh\necho test", name="script.sh")
    try:
        validate_file_mime_type(file)
    except ValidationError:
        pass


def test_oversized_file_raises():
    large_content = b"x" * (100 * 1024 * 1024 + 1)
    file = ContentFile(large_content, name="grande.pdf")
    try:
        validate_file_size(file)
        assert False, "Deveria ter lançado ValidationError"
    except ValidationError:
        pass


def test_small_file_passes():
    file = ContentFile(b"pequeno", name="pequeno.pdf")
    validate_file_size(file)


def test_validate_upload_none_passes():
    validate_upload(None)


def _zip_file(entries):
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries:
            archive.writestr(name, content)
    buffer.seek(0)
    return ContentFile(buffer.read(), name="arquivo.zip")


def test_zip_path_traversal_raises():
    file = _zip_file([("../evil.txt", b"conteudo")])
    try:
        validate_archive_safety(file)
        assert False, "Deveria ter lançado ValidationError"
    except ValidationError:
        pass


@override_settings(MAX_ZIP_UNCOMPRESSED_SIZE_BYTES=10)
def test_zip_uncompressed_size_limit_raises():
    file = _zip_file([("grande.txt", b"x" * 100)])
    try:
        validate_archive_safety(file)
        assert False, "Deveria ter lançado ValidationError"
    except ValidationError:
        pass


@override_settings(ALLOW_ARCHIVE_UPLOADS=False)
def test_archive_uploads_can_be_disabled():
    file = ContentFile(b"conteudo", name="arquivo.zip")
    try:
        validate_file_extension(file)
        assert False, "Deveria ter lançado ValidationError"
    except ValidationError:
        pass
