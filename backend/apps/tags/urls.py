"""Rotas de tags."""

from rest_framework.routers import DefaultRouter

from apps.tags.views import TagViewSet

router = DefaultRouter()
router.register(r"", TagViewSet, basename="tags")

urlpatterns = router.urls
