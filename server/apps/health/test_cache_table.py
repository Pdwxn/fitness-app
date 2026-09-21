import importlib
from types import SimpleNamespace

import pytest
from django.core.cache import caches
from django.db import connection
from django.test import override_settings

# The migration only reads .connection.alias; a real schema editor can't run inside SQLite tests.
EDITOR = SimpleNamespace(connection=connection)

DB_CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    },
}


@pytest.mark.django_db
def test_migration_creates_a_working_shared_cache_table():
    migration = importlib.import_module("apps.health.migrations.0001_create_cache_table")

    with override_settings(CACHES=DB_CACHES):
        migration.create_cache_tables(None, EDITOR)
        migration.create_cache_tables(None, EDITOR)  # idempotent

        caches["default"].set("throttle:probe", [1, 2, 3], 60)
        assert caches["default"].get("throttle:probe") == [1, 2, 3]


@pytest.mark.django_db
def test_migration_is_a_noop_for_locmem():
    migration = importlib.import_module("apps.health.migrations.0001_create_cache_table")

    migration.create_cache_tables(None, EDITOR)

    assert "django_cache" not in connection.introspection.table_names()


def test_production_uses_the_database_cache(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    from config.settings import production

    assert production.CACHES["default"]["BACKEND"].endswith("DatabaseCache")
