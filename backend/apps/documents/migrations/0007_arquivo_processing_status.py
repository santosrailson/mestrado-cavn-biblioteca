from django.db import migrations, models


def mark_existing_files_as_completed(apps, schema_editor):
    Arquivo = apps.get_model("documents", "Arquivo")
    Arquivo.objects.all().update(
        processamento_status="concluido",
        processamento_etapa="legado",
        processamento_progresso=100,
    )


class Migration(migrations.Migration):
    dependencies = [("documents", "0006_remove_document_documents_d_status_52b1a4_idx_and_more")]

    operations = [
        migrations.AddField(
            model_name="arquivo",
            name="processamento_status",
            field=models.CharField(
                choices=[
                    ("pendente", "Pendente"),
                    ("processando", "Processando"),
                    ("concluido", "Concluído"),
                    ("falhou", "Falhou"),
                ],
                default="pendente",
                max_length=20,
                verbose_name="Status do processamento",
            ),
        ),
        migrations.AddField(
            model_name="arquivo",
            name="processamento_etapa",
            field=models.CharField(blank=True, max_length=40, verbose_name="Etapa do processamento"),
        ),
        migrations.AddField(
            model_name="arquivo",
            name="processamento_progresso",
            field=models.PositiveSmallIntegerField(default=0, verbose_name="Progresso do processamento"),
        ),
        migrations.AddField(
            model_name="arquivo",
            name="processamento_erro",
            field=models.TextField(blank=True, verbose_name="Erro do processamento"),
        ),
        migrations.RunPython(
            mark_existing_files_as_completed,
            migrations.RunPython.noop,
        ),
    ]
