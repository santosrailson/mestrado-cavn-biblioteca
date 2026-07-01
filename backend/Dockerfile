# =============================================================================
# Dockerfile — Backend Django do Repositório Digital CAVN
# =============================================================================
FROM python:3.11-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependências de sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmagic1 \
    libmagic-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libwebp-dev \
    libpng-dev \
    curl \
    tesseract-ocr \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-privilegiado para rodar a aplicação
RUN groupadd -r appgroup --gid=1000 && \
    useradd -r -g appgroup --uid=1000 --home=/app appuser

# Instala dependências Python
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Cópia do projeto
COPY --chown=appuser:appgroup . .

# Cria diretórios de mídia, estáticos e logs com permissões corretas
RUN mkdir -p media staticfiles logs && \
    chown -R appuser:appgroup /app

# Exposição da porta
EXPOSE 8000

# Comando padrão (sobrescrito pelo docker-compose)
USER appuser
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--access-logfile", "-"]
