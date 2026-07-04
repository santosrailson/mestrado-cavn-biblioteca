import factory

from apps.timeline.models import TimelineEvent


class TimelineEventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TimelineEvent

    titulo = factory.Sequence(lambda n: f"Evento {n}")
    data_evento = factory.Faker("date_between", start_date="-80y", end_date="-1y")
