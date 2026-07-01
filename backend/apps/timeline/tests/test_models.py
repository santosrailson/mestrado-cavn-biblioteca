import pytest
from datetime import date

from apps.timeline.models import TimelineEvent


@pytest.mark.django_db
def test_timeline_event_str():
    evento = TimelineEvent.objects.create(
        titulo="Fundação do CAVN",
        descricao="Evento histórico",
        data_evento=date(1938, 1, 15),
    )
    assert str(evento) == "1938 — Fundação do CAVN"
