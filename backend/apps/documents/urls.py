"""Rotas de documentos, autores, arquivos e busca."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.documents.views import (
    ArquivoViewSet,
    AutorViewSet,
    BuscaViewSet,
    DocumentViewSet,
)

router = DefaultRouter()
# Registra viewsets de prefixo fixo antes do DocumentViewSet (prefixo vazio),
# evitando que "arquivos" e "autores" sejam interpretados como slugs de documento.
router.register(r"arquivos", ArquivoViewSet, basename="arquivos")
router.register(r"autores", AutorViewSet, basename="autores")
router.register(r"", DocumentViewSet, basename="documentos")

urlpatterns = [
    path("busca/", BuscaViewSet.as_view({"get": "list"}), name="busca"),
]
urlpatterns += router.urls
