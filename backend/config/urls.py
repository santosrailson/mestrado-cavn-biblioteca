"""URL configuration for cavn_digital project."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/categorias/", include("apps.categories.urls")),
    path("api/v1/tags/", include("apps.tags.urls")),
    path("api/v1/documentos/", include("apps.documents.urls")),
    path("api/v1/timeline/", include("apps.timeline.urls")),
    path("api/v1/galeria/", include("apps.gallery.urls")),
    path("api/v1/producao-academica/", include("apps.academic.urls")),
    path("api/v1/audit/", include("apps.audit.urls")),
    path("api/v1/config/", include("apps.system_config.urls")),
    # Documentação OpenAPI (sob /api/v1/ para ser roteada pelo nginx do host)
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/swagger/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/v1/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
