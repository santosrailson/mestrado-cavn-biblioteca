"""Adiciona campo search_vector (tsvector) e GIN index para full-text search."""

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import connection, migrations


def _is_postgres():
    return connection.vendor == "postgresql"


def add_fts(apps, schema_editor):
    if not _is_postgres():
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS documents_titulo_trgm_idx
                ON documents_document USING GIN (titulo gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS documents_resumo_trgm_idx
                ON documents_document USING GIN (resumo gin_trgm_ops);
            """
        )
        cursor.execute(
            """
            CREATE OR REPLACE FUNCTION documents_search_vector_update()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.search_vector :=
                    setweight(to_tsvector('portuguese', coalesce(NEW.titulo, '')), 'A') ||
                    setweight(to_tsvector('portuguese', coalesce(NEW.resumo, '')), 'B') ||
                    setweight(to_tsvector('portuguese', coalesce(NEW.descricao, '')), 'C') ||
                    setweight(to_tsvector('portuguese', coalesce(NEW.codigo_referencia, '')), 'D');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents_document;

            CREATE TRIGGER documents_search_vector_trigger
            BEFORE INSERT OR UPDATE ON documents_document
            FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
            """
        )
        cursor.execute(
            """
            UPDATE documents_document SET search_vector =
                setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
                setweight(to_tsvector('portuguese', coalesce(resumo, '')), 'B') ||
                setweight(to_tsvector('portuguese', coalesce(descricao, '')), 'C') ||
                setweight(to_tsvector('portuguese', coalesce(codigo_referencia, '')), 'D');
            """
        )


def remove_fts(apps, schema_editor):
    if not _is_postgres():
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents_document;"
        )
        cursor.execute("DROP FUNCTION IF EXISTS documents_search_vector_update();")
        cursor.execute("DROP INDEX IF EXISTS documents_titulo_trgm_idx;")
        cursor.execute("DROP INDEX IF EXISTS documents_resumo_trgm_idx;")
        cursor.execute("DROP EXTENSION IF EXISTS pg_trgm;")
        cursor.execute("UPDATE documents_document SET search_vector = NULL;")


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="search_vector",
            field=SearchVectorField(blank=True, null=True, verbose_name="Vetor de busca"),
        ),
        migrations.AddIndex(
            model_name="document",
            index=GinIndex(fields=["search_vector"], name="documents_search_vector_gin"),
        ),
        migrations.RunPython(add_fts, reverse_code=remove_fts),
    ]
