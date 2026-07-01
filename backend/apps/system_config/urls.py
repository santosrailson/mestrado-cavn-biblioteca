"""Rotas de configurações."""

from rest_framework.routers import DefaultRouter

from apps.system_config.views import ConfiguracaoViewSet

router = DefaultRouter()
router.register(r"", ConfiguracaoViewSet, basename="configuracoes")

urlpatterns = router.urls
