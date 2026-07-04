# =============================================================================
# Dockerfile — Backend Django do Repositório Digital CAVN
# =============================================================================
# Multi-stage build: ferramentas de compilação (build-essential, *-dev) ficam
# restritas ao estágio "builder" e não chegam na imagem final, reduzindo
# superfície de ataque e tamanho da imagem de produção.
# =============================================================================

FROM python:3.14-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependências de sistema necessárias apenas para compilar os pacotes Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmagic-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libwebp-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip wheel --wheel-dir /wheels -r requirements.txt


FROM python:3.14-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Apenas bibliotecas de runtime (sem headers/compiladores) + Tesseract para OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libmagic1 \
    libjpeg62-turbo \
    zlib1g \
    libfreetype6 \
    liblcms2-2 \
    libopenjp2-7 \
    libtiff6 \
    libwebp7 \
    libpng16-16 \
    curl \
    tesseract-ocr \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-privilegiado para rodar a aplicação
RUN groupadd -r appgroup --gid=1000 && \
    useradd -r -g appgroup --uid=1000 --home=/app appuser

# Instala dependências Python a partir dos wheels pré-compilados no estágio
# anterior — não precisa de compilador nem acesso à internet neste estágio.
COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-index --find-links=/wheels -r requirements.txt && \
    rm -rf /wheels

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
