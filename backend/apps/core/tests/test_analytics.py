import pytest
from rest_framework.test import APIClient

from apps.core.models import AnalyticsEvent
from apps.users.tests.factories import UserFactory


@pytest.mark.django_db
class TestAnalytics:
    def test_event_is_stored_without_non_primitive_properties(self):
        response = APIClient().post(
            "/api/v1/analytics/events/",
            {
                "name": "search_completed",
                "properties": {"result_count": 3, "nested": {"secret": "discard"}},
                "path": "/busca",
            },
            format="json",
        )

        assert response.status_code == 204
        event = AnalyticsEvent.objects.get(name="search_completed")
        assert event.properties == {"result_count": 3}

    def test_summary_requires_privileged_user(self):
        client = APIClient()
        assert client.get("/api/v1/analytics/summary/").status_code == 401

        user = UserFactory(role="catalogador")
        client.force_authenticate(user=user)
        assert client.get("/api/v1/analytics/summary/").status_code == 200
