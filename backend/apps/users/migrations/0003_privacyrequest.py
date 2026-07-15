from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_solicitacaoalteracaosenha"),
    ]

    operations = [
        migrations.CreateModel(
            name="PrivacyRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("tipo", models.CharField(choices=[("acesso", "Confirmação e acesso"), ("correcao", "Correção de dados"), ("eliminacao", "Eliminação, quando aplicável"), ("portabilidade", "Portabilidade"), ("oposicao", "Oposição ao tratamento"), ("consentimento", "Revogação de consentimento")], max_length=20, verbose_name="Tipo")),
                ("descricao", models.TextField(max_length=4000, verbose_name="Descrição")),
                ("status", models.CharField(choices=[("pendente", "Pendente"), ("em_analise", "Em análise"), ("concluida", "Concluída"), ("rejeitada", "Rejeitada")], default="pendente", max_length=20, verbose_name="Status")),
                ("resposta", models.TextField(blank=True, verbose_name="Resposta")),
                ("criado_em", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
                ("atualizado_em", models.DateTimeField(auto_now=True, verbose_name="Atualizado em")),
                ("resolvido_em", models.DateTimeField(blank=True, null=True, verbose_name="Resolvido em")),
                ("resolvido_por", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="privacy_requests_resolved", to=settings.AUTH_USER_MODEL, verbose_name="Resolvido por")),
                ("usuario", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="privacy_requests", to=settings.AUTH_USER_MODEL, verbose_name="Titular")),
            ],
            options={"verbose_name": "Solicitação de privacidade", "verbose_name_plural": "Solicitações de privacidade", "ordering": ["-criado_em"], "indexes": [models.Index(fields=["usuario", "status"], name="privacy_user_status_idx")]},
        ),
    ]
