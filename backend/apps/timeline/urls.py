"""Rotas da linha do tempo."""

from rest_framework.routers import DefaultRouter

from apps.timeline.views import TimelineEventViewSet

router = DefaultRouter()
router.register(r"eventos", TimelineEventViewSet, basename="timeline-eventos")

urlpatterns = router.urls
