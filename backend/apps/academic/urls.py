"""Rotas de produção acadêmica."""

from rest_framework.routers import DefaultRouter

from apps.academic.views import ProducaoAcademicaViewSet

router = DefaultRouter()
router.register(r"", ProducaoAcademicaViewSet, basename="producao-academica")

urlpatterns = router.urls
