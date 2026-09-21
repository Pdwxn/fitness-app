from django.conf import settings
from django.core.management import call_command
from django.db import migrations

DATABASE_CACHE = "django.core.cache.backends.db.DatabaseCache"


def create_cache_tables(apps, schema_editor):
    """Create the table behind every DatabaseCache in CACHES.

    Production keeps the API throttle counters in the database so all gunicorn
    workers share them. Doing it in a migration means a deploy that already runs
    ``migrate`` can't forget ``createcachetable`` (a missing table would 500
    every request). A no-op wherever the cache isn't database-backed.
    """
    for config in settings.CACHES.values():
        if config["BACKEND"] == DATABASE_CACHE:
            call_command("createcachetable", config["LOCATION"], database=schema_editor.connection.alias)


class Migration(migrations.Migration):
    dependencies = []
    operations = [migrations.RunPython(create_cache_tables, migrations.RunPython.noop)]
