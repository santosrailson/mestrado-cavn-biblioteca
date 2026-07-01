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
router.register(r"", DocumentViewSet, basename="documentos")
router.register(r"autores", AutorViewSet, basename="autores")
router.register(r"arquivos", ArquivoViewSet, basename="arquivos")

urlpatterns = [
    path("busca/", BuscaViewSet.as_view({"get": "list"}), name="busca"),
]
urlpatterns += router.urls
