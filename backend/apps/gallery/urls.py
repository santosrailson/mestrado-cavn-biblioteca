"""Rotas da galeria."""

from rest_framework.routers import DefaultRouter

from apps.gallery.views import AlbumViewSet, FotoViewSet

router = DefaultRouter()
router.register(r"albuns", AlbumViewSet, basename="albuns")
router.register(r"fotos", FotoViewSet, basename="fotos")

urlpatterns = router.urls
