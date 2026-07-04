"""Configurações para testes automatizados.

Mantém a maior parte do settings de produção/desenvolvimento, mas remove
comportamentos de borda que atrapalham testes de API no test client.
"""

import os

# Garante valores mínimos antes de importar o settings base, evitando que
# as validações de produção (DEBUG=False / ALLOWED_HOSTS vazio) disparem
# durante o import em ambientes sem um arquivo .env configurado.
os.environ["DEBUG"] = "True"
os.environ["ALLOWED_HOSTS"] = "*"

from .settings import *  # noqa: F401,F403

DEBUG = True
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
