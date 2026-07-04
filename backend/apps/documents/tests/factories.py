import factory

from apps.core.constants import DocumentStatus
from apps.documents.models import Document


class DocumentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Document

    titulo = factory.Sequence(lambda n: f"Documento {n}")
    tipo_documento = "ata"
    status = DocumentStatus.DRAFT
