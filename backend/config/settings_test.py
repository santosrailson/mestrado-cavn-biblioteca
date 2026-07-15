"""Configurações para testes automatizados.

Mantém a maior parte do settings de produção/desenvolvimento, mas remove
comportamentos de borda que atrapalham testes de API no test client.
"""

import os
import tempfile

# Garante valores mínimos antes de importar o settings base, evitando que
# as validações de produção (DEBUG=False / ALLOWED_HOSTS vazio) disparem
# durante o import em ambientes sem um arquivo .env configurado.
os.environ["DEBUG"] = "True"
os.environ["ALLOWED_HOSTS"] = "*"

from .settings import *  # noqa: F401,F403

DEBUG = True
TESTING = True
ALLOWED_HOSTS = ["*"]
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Isola uploads de teste do volume persistente da aplicação.
MEDIA_ROOT = tempfile.mkdtemp(prefix="cavn-test-media-")

# O ambiente gerenciado pode deixar o arquivo de log de desenvolvimento
# pertencente a outro usuário. Testes não precisam gravar logs em disco.
LOGGING_CONFIG = None

# Testes unitários não dependem de um daemon Redis externo; o CI de integração
# continua cobrindo Redis através do serviço configurado no workflow.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "cavn-digital-test-cache",
    },
    "axes": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "cavn-digital-test-axes",
    },
}

# O ambiente de testes usa cache local para não depender de Redis. Os checks
# de produção do django-ratelimit/axes exigem cache compartilhado e não se
# aplicam a esta configuração isolada.
SILENCED_SYSTEM_CHECKS = [
    "django_ratelimit.E003",
    "django_ratelimit.W001",
    "axes.W001",
]
