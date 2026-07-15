import hashlib
import json

from django.db import migrations, models


def backfill_chain(apps, schema_editor):
    Auditoria = apps.get_model("audit", "Auditoria")
    previous_hash = ""
    fields = [
        "id", "usuario_id", "acao", "entidade", "entidade_id",
        "dados_anteriores", "dados_novos", "ip_address", "user_agent", "previous_hash",
    ]
    for registro in Auditoria.objects.order_by("created_at", "id"):
        registro.previous_hash = previous_hash
        payload = {field: str(getattr(registro, field)) if field == "id" else getattr(registro, field) for field in fields}
        payload["usuario_id"] = str(registro.usuario_id) if registro.usuario_id else None
        payload["previous_hash"] = previous_hash
        raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        registro.integrity_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        Auditoria.objects.filter(pk=registro.pk).update(
            previous_hash=registro.previous_hash,
            integrity_hash=registro.integrity_hash,
        )
        previous_hash = registro.integrity_hash


class Migration(migrations.Migration):
    dependencies = [("audit", "0002_initial")]

    operations = [
        migrations.AddField(
            model_name="auditoria",
            name="previous_hash",
            field=models.CharField(blank=True, editable=False, max_length=64, verbose_name="Hash anterior"),
        ),
        migrations.AddField(
            model_name="auditoria",
            name="integrity_hash",
            field=models.CharField(blank=True, editable=False, max_length=64, verbose_name="Hash de integridade"),
        ),
        migrations.AddIndex(
            model_name="auditoria",
            index=models.Index(fields=["created_at", "id"], name="audit_chain_order_idx"),
        ),
        migrations.RunPython(backfill_chain, migrations.RunPython.noop),
    ]
