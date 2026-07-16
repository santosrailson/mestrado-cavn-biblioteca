"""
Configuração do Django para o Repositório Digital CAVN.

Todas as credenciais sensíveis devem ser fornecidas via variáveis de ambiente.
Consulte .env.example para a lista completa.
"""

import logging
import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# =============================================================================
# Segurança
# =============================================================================
SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-change-in-production")
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()
]

# Validações obrigatórias para ambientes de produção.
if not DEBUG:
    if not SECRET_KEY or SECRET_KEY in (
        "dev-key-change-in-production",
        "dev-secret-key-change-in-production",
    ):
        raise ImproperlyConfigured(
            "SECRET_KEY deve ser configurado com um valor seguro em produção."
        )
    if not ALLOWED_HOSTS:
        raise ImproperlyConfigured("ALLOWED_HOSTS não pode estar vazio quando DEBUG=False.")
    if "*" in ALLOWED_HOSTS:
        raise ImproperlyConfigured(
            "ALLOWED_HOSTS não pode conter '*' em produção — liste os domínios explicitamente."
        )

# =============================================================================
# Aplicações
# =============================================================================
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "unfold",
    "django_cleanup.apps.CleanupConfig",
    "django_ratelimit",
    "axes",
    "django_otp",
    "django_otp.plugins.otp_totp",
]

# django-csp é opcional até que as dependências sejam reinstaladas
try:
    import csp  # noqa: F401

    THIRD_PARTY_APPS.append("csp")
    CSP_AVAILABLE = True
except ImportError:
    CSP_AVAILABLE = False

LOCAL_APPS = [
    "apps.core",
    "apps.users",
    "apps.categories",
    "apps.tags",
    "apps.documents",
    "apps.timeline",
    "apps.gallery",
    "apps.academic",
    "apps.audit",
    "apps.system_config",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# =============================================================================
# Middleware
# =============================================================================
MIDDLEWARE = [
    "apps.core.middleware.RequestIdMiddleware",
    "apps.core.metrics.MetricsMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "apps.core.middleware.NoCacheAPIMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Deve vir depois de AuthenticationMiddleware (requisito do django-axes)
    # e por último na lista para observar a resposta final de todos os demais.
    "axes.middleware.AxesMiddleware",
]

if CSP_AVAILABLE:
    MIDDLEWARE.append("csp.middleware.CSPMiddleware")

# =============================================================================
# URLs e Templates
# =============================================================================
ROOT_URLCONF = "config.urls"
ADMIN_URL = os.getenv("ADMIN_URL", "django-admin/")
SITE_NAME = os.getenv("SITE_NAME", "CAVN Digital")

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# =============================================================================
# Banco de dados
# =============================================================================
DB_ENGINE = os.getenv("DB_ENGINE", "postgresql")
if DB_ENGINE == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / os.getenv("DB_NAME", "db.sqlite3"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "cavn_digital"),
            "USER": os.getenv("DB_USER", "cavn_digital"),
            "PASSWORD": os.getenv("DB_PASSWORD", "cavn_digital"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        }
    }

# =============================================================================
# Modelo de usuário customizado
# =============================================================================
AUTH_USER_MODEL = "users.User"

# =============================================================================
# Validação de senhas
# =============================================================================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# =============================================================================
# Autenticação e account lockout (django-axes)
# =============================================================================
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AXES_FAILURE_LIMIT = int(os.getenv("AXES_FAILURE_LIMIT", "5"))
AXES_COOLOFF_TIME = timedelta(minutes=int(os.getenv("AXES_COOLOFF_TIME_MINUTES", "15")))
AXES_RESET_ON_SUCCESS = True
AXES_LOCK_OUT_PARAMETERS = ["username", "ip_address"]
AXES_USERNAME_FORM_FIELD = "email"
AXES_HANDLER = "axes.handlers.cache.AxesCacheHandler"
AXES_CACHE = "axes"

# =============================================================================
# Internacionalização
# =============================================================================
LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "pt-br")
TIME_ZONE = os.getenv("TIME_ZONE", "America/Fortaleza")
USE_I18N = True
USE_TZ = True

# =============================================================================
# Arquivos estáticos e mídia
# =============================================================================
STATIC_URL = os.getenv("STATIC_URL", "/static/")
STATIC_ROOT = BASE_DIR / os.getenv("STATIC_ROOT", "staticfiles")
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
MEDIA_ROOT = BASE_DIR / os.getenv("MEDIA_ROOT", "media")
USE_X_ACCEL_REDIRECT = os.getenv("USE_X_ACCEL_REDIRECT", str(not DEBUG)).lower() in (
    "true",
    "1",
    "yes",
)
METRICS_TOKEN = os.getenv("METRICS_TOKEN", "")

# =============================================================================
# Default primary key
# =============================================================================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =============================================================================
# Django REST Framework
# =============================================================================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.users.authentication.JWTCookieAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("DRF_ANON_THROTTLE_RATE", "300/min"),
        "user": os.getenv("DRF_USER_THROTTLE_RATE", "600/min"),
    },
}

# =============================================================================
# SimpleJWT
# =============================================================================
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.CavnTokenObtainPairSerializer",
    "TOKEN_REFRESH_SERIALIZER": "apps.users.serializers.CavnTokenRefreshSerializer",
}
REQUIRE_TOKEN_VERSION = os.getenv("REQUIRE_TOKEN_VERSION", str(not DEBUG)).lower() in (
    "true",
    "1",
    "yes",
)

# 2FA obrigatório para perfis que podem alterar ou publicar o acervo.
MANDATORY_2FA_FOR_PRIVILEGED = os.getenv(
    "MANDATORY_2FA_FOR_PRIVILEGED", str(not DEBUG)
).lower() in ("true", "1", "yes")
TWO_FACTOR_ENROLLMENT_TOKEN_LIFETIME_SECONDS = int(
    os.getenv("TWO_FACTOR_ENROLLMENT_TOKEN_LIFETIME_SECONDS", "600")
)
TWO_FACTOR_LOGIN_CHALLENGE_LIFETIME_SECONDS = int(
    os.getenv("TWO_FACTOR_LOGIN_CHALLENGE_LIFETIME_SECONDS", "300")
)
TWO_FACTOR_RECOVERY_CODE_COUNT = int(os.getenv("TWO_FACTOR_RECOVERY_CODE_COUNT", "10"))
PRIVACY_REQUEST_SLA_DAYS = int(os.getenv("PRIVACY_REQUEST_SLA_DAYS", "15"))
PRIVACY_DPO_NAME = os.getenv("PRIVACY_DPO_NAME", "Responsável institucional pela privacidade")
PRIVACY_DPO_EMAIL = os.getenv("PRIVACY_DPO_EMAIL", "cavn@ufpb.br")

# =============================================================================
# CORS
# =============================================================================
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
# drf-spectacular
# =============================================================================
SPECTACULAR_SETTINGS = {
    "TITLE": "Repositório Digital CAVN API",
    "DESCRIPTION": "API REST pública e administrativa do Repositório Digital do Colégio Agrícola Vidal de Negreiros.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PUBLIC": False,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAdminUser"],
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"^/api/v1/",
}

# =============================================================================
# django-unfold
# =============================================================================
UNFOLD = {
    "SITE_TITLE": "Repositório Digital CAVN",
    "SITE_HEADER": "Repositório Digital CAVN",
    "SITE_SYMBOL": "museum",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
}

# =============================================================================
# Celery
# =============================================================================
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# =============================================================================
# Cache com Redis
# =============================================================================
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    },
    "axes": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    },
}

# =============================================================================
# Uploads
# =============================================================================
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("DATA_UPLOAD_MAX_MEMORY_SIZE", "104857600"))
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("FILE_UPLOAD_MAX_MEMORY_SIZE", "104857600"))
MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", "104857600"))
ALLOW_ARCHIVE_UPLOADS = os.getenv("ALLOW_ARCHIVE_UPLOADS", "False").lower() in (
    "true",
    "1",
    "yes",
)
MAX_ZIP_ENTRIES = int(os.getenv("MAX_ZIP_ENTRIES", "1000"))
MAX_ZIP_UNCOMPRESSED_SIZE_BYTES = int(
    os.getenv("MAX_ZIP_UNCOMPRESSED_SIZE_BYTES", str(MAX_UPLOAD_SIZE_BYTES * 3))
)
MAX_ZIP_COMPRESSION_RATIO = int(os.getenv("MAX_ZIP_COMPRESSION_RATIO", "100"))

# O scanner é opcional no ambiente local, mas pode ser tornado obrigatório em
# produção quando um daemon ClamAV isolado estiver disponível na rede interna.
ANTIVIRUS_ENABLED = os.getenv("ANTIVIRUS_ENABLED", "False").lower() in ("true", "1", "yes")
ANTIVIRUS_REQUIRED = os.getenv("ANTIVIRUS_REQUIRED", str(not DEBUG)).lower() in (
    "true",
    "1",
    "yes",
)
ANTIVIRUS_HOST = os.getenv("ANTIVIRUS_HOST", "clamav")
ANTIVIRUS_PORT = int(os.getenv("ANTIVIRUS_PORT", "3310"))
ANTIVIRUS_TIMEOUT_SECONDS = int(os.getenv("ANTIVIRUS_TIMEOUT_SECONDS", "30"))

# =============================================================================
# E-mail
# =============================================================================
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@cavn.ufpb.br")

# =============================================================================
# Logging
# =============================================================================
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)


class _JsonFormatter(logging.Formatter):
    """Formata cada linha de log como JSON para ingestão por ferramentas de observabilidade."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        from apps.core.middleware import request_id_var

        payload: dict = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "lineno": record.lineno,
            "request_id": request_id_var.get(),
        }
        if record.exc_info:
            payload["exc"] = traceback.format_exception(*record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": _JsonFormatter,
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if not DEBUG else "simple",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "cavn_digital.log",
            "maxBytes": 10485760,
            "backupCount": 5,
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# =============================================================================
# Proxy / reverse proxy
# O Nginx do host encerra SSL e repassa requisições via HTTP para o backend.
# Esses cabeçalhos permitem que o Django detecte o protocolo original.
# =============================================================================
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# =============================================================================
# Headers de segurança (ajustar conforme ambiente)
# =============================================================================
# Em produção forçamos HTTPS/HSTS e cookies seguros. Este comportamento só pode
# ser desabilitado com DUAS variáveis explícitas (defesa em profundidade contra
# desativação acidental em produção): DISABLE_HTTPS_ENFORCEMENT e
# ACKNOWLEDGE_INSECURE_HTTPS_DISABLED, ambas "True".
_DISABLE_HTTPS_ENFORCEMENT_REQUESTED = os.getenv("DISABLE_HTTPS_ENFORCEMENT", "False").lower() in (
    "true",
    "1",
    "yes",
)
_ACKNOWLEDGE_INSECURE_HTTPS_DISABLED = os.getenv(
    "ACKNOWLEDGE_INSECURE_HTTPS_DISABLED", "False"
).lower() in ("true", "1", "yes")
if _DISABLE_HTTPS_ENFORCEMENT_REQUESTED and not _ACKNOWLEDGE_INSECURE_HTTPS_DISABLED:
    raise ImproperlyConfigured(
        "DISABLE_HTTPS_ENFORCEMENT=True exige também "
        "ACKNOWLEDGE_INSECURE_HTTPS_DISABLED=True, para evitar desativação "
        "acidental da segurança HTTPS em produção."
    )
_DISABLE_HTTPS_ENFORCEMENT = (
    _DISABLE_HTTPS_ENFORCEMENT_REQUESTED and _ACKNOWLEDGE_INSECURE_HTTPS_DISABLED
)
if _DISABLE_HTTPS_ENFORCEMENT:
    logging.getLogger(__name__).warning(
        "DISABLE_HTTPS_ENFORCEMENT está ativo — HSTS, redirecionamento SSL e "
        "cookies seguros foram desabilitados manualmente. Não use isso em "
        "produção real."
    )

if not DEBUG and not _DISABLE_HTTPS_ENFORCEMENT:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "False").lower() in (
        "true",
        "1",
        "yes",
    )
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
    SECURE_HSTS_PRELOAD = SECURE_HSTS_SECONDS > 0

    _force_secure_cookies = SECURE_SSL_REDIRECT or os.getenv(
        "FORCE_SECURE_COOKIES", "False"
    ).lower() in ("true", "1", "yes")
    SESSION_COOKIE_SECURE = os.getenv(
        "SESSION_COOKIE_SECURE", str(_force_secure_cookies)
    ).lower() in ("true", "1", "yes")
    CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", str(_force_secure_cookies)).lower() in (
        "true",
        "1",
        "yes",
    )

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# Header adicional para política de referrer
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# =============================================================================
# Content Security Policy (CSP)
# Ajuste as diretivas conforme recursos externos utilizados pelo frontend.
# =============================================================================
if not DEBUG and not CSP_AVAILABLE:
    raise ImproperlyConfigured(
        "django-csp deve estar instalado em produção. Instale a dependência "
        "ou remova esta validação se utilizar outra solução de CSP."
    )

if CSP_AVAILABLE:
    CSP_DEFAULT_SRC = ("'self'",)
    CSP_SCRIPT_SRC = ("'self'",)
    CSP_STYLE_SRC = ("'self'", "https://fonts.bunny.net")
    CSP_IMG_SRC = ("'self'", "data:", "blob:")
    CSP_FONT_SRC = ("'self'", "https://fonts.bunny.net")
    CSP_CONNECT_SRC = ("'self'", "https://fonts.bunny.net")
    CSP_FRAME_ANCESTORS = ("'none'",)
    CSP_BASE_URI = ("'self'",)
    CSP_FORM_ACTION = ("'self'",)
    CSP_OBJECT_SRC = ("'none'",)
    CSP_MEDIA_SRC = ("'self'",)
    CSP_UPGRADE_INSECURE_REQUESTS = True

# =============================================================================
# Sentry (opcional)
# =============================================================================
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", "production" if not DEBUG else "development")
SENTRY_RELEASE = os.getenv("SENTRY_RELEASE", "")
ANALYTICS_RETENTION_DAYS = int(os.getenv("ANALYTICS_RETENTION_DAYS", "180"))

if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_logging = LoggingIntegration(
        level=logging.INFO,
        event_level=logging.ERROR,
    )

    _sentry_integrations = [
        DjangoIntegration(),
        CeleryIntegration(),
        RedisIntegration(),
        sentry_logging,
    ]

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=_sentry_integrations,
        environment=SENTRY_ENVIRONMENT,
        release=SENTRY_RELEASE or None,
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.05")),
        send_default_pii=False,
    )
