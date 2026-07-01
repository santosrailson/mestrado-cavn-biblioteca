"""Utilitários compartilhados do projeto."""

import hashlib
import os
import uuid
from datetime import datetime

from django.utils.text import slugify


def generate_unique_slug(model_class, base_value, max_length=255):
    """Gera um slug único para uma instância de modelo."""
    slug = slugify(base_value)[:max_length]
    original = slug
    counter = 1
    while model_class.objects.filter(slug=slug).exists():
        suffix = f"-{counter}"
        slug = f"{original[: max_length - len(suffix)]}{suffix}"
        counter += 1
    return slug


def upload_path(instance, filename, folder="uploads"):
    """Gera caminho de upload organizado por data."""
    now = datetime.now()
    ext = os.path.splitext(filename)[1].lower()
    unique = uuid.uuid4().hex[:12]
    return f"{folder}/{now.year}/{now.month:02d}/{unique}{ext}"


def calculate_sha256(file_obj):
    """Calcula o checksum SHA-256 de um arquivo."""
    hash_obj = hashlib.sha256()
    if hasattr(file_obj, "seek"):
        file_obj.seek(0)
    for chunk in iter(lambda: file_obj.read(8192), b""):
        hash_obj.update(chunk)
    if hasattr(file_obj, "seek"):
        file_obj.seek(0)
    return hash_obj.hexdigest()


def get_client_ip(request):
    """Extrai o endereço IP do cliente a partir do request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
