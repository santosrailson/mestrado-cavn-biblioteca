import factory

from apps.academic.models import ProducaoAcademica


class ProducaoAcademicaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProducaoAcademica

    titulo = factory.Sequence(lambda n: f"Produção {n}")
    autor = "Autor de Teste"
    ano = 2020
