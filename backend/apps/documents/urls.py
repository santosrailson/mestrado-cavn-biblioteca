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
# Atenção: "autores" e "arquivos" precisam ser registrados ANTES do prefixo vazio
# de DocumentViewSet. O resolver de URLs do Django usa o primeiro padrão que
# casar na ordem de urlpatterns — a rota de detalhe de DocumentViewSet
# (^(?P<slug>[^/.]+)/$) casa com qualquer segmento único, incluindo "arquivos/"
# e "autores/". Se DocumentViewSet for registrado primeiro, essa rota-coringa
# intercepta as rotas de lista/criação de AutorViewSet e ArquivoViewSet antes
# que elas sejam alcançadas (ex.: POST /documentos/arquivos/ retornava 405).
router.register(r"autores", AutorViewSet, basename="autores")
router.register(r"arquivos", ArquivoViewSet, basename="arquivos")
router.register(r"", DocumentViewSet, basename="documentos")

urlpatterns = [
    path("busca/", BuscaViewSet.as_view({"get": "list"}), name="busca"),
]
urlpatterns += router.urls
