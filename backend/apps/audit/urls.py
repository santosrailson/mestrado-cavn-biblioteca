"""Rotas de auditoria."""

from rest_framework.routers import DefaultRouter

from apps.audit.views import AuditoriaViewSet

router = DefaultRouter()
router.register(r"", AuditoriaViewSet, basename="auditoria")

urlpatterns = router.urls
