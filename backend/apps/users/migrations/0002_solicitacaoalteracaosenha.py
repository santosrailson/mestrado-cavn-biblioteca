from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SolicitacaoAlteracaoSenha',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('senha_hash', models.CharField(max_length=256, verbose_name='Senha (hash)')),
                ('status', models.CharField(
                    choices=[('pendente', 'Pendente'), ('aprovada', 'Aprovada'), ('rejeitada', 'Rejeitada')],
                    default='pendente',
                    max_length=20,
                    verbose_name='Status',
                )),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('resolvido_em', models.DateTimeField(blank=True, null=True, verbose_name='Resolvido em')),
                ('resolvido_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='solicitacoes_resolvidas',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Resolvido por',
                )),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='solicitacoes_senha',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Usuário',
                )),
            ],
            options={
                'verbose_name': 'Solicitação de Alteração de Senha',
                'verbose_name_plural': 'Solicitações de Alteração de Senha',
                'ordering': ['-criado_em'],
            },
        ),
    ]
