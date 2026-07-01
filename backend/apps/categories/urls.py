"""Rotas de categorias."""

from rest_framework.routers import DefaultRouter

from apps.categories.views import CategoriaViewSet

router = DefaultRouter()
router.register(r"", CategoriaViewSet, basename="categorias")

urlpatterns = router.urls
