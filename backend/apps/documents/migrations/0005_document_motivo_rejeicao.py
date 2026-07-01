# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0004_alter_arquivo_arquivo"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="motivo_rejeicao",
            field=models.TextField(blank=True, verbose_name="Motivo da rejeição"),
        ),
    ]
