"""Rotas raiz agrupadas sob /api/v1/."""

from django.urls import path

from apps.core import views

app_name = "core"

urlpatterns = [
    path("health/", views.HealthCheckView.as_view(), name="health-check"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("analytics/vitals/", views.WebVitalsView.as_view(), name="web-vitals"),
    path("analytics/events/", views.AnalyticsEventView.as_view(), name="analytics-event"),
    path("analytics/summary/", views.AnalyticsSummaryView.as_view(), name="analytics-summary"),
]
