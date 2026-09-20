from django.db import migrations


def backfill_source_external_id(apps, schema_editor):
    """Re-runs enrichment so name-matched (bank/fuzzy) exercises get a stable
    ``source_external_id`` too -- previously only the manual-builder fast path
    set it. Needed for the client-side progression engine to group logs for
    "the same exercise" across routines/months. Same precedent as
    0003_import_exercisedb calling the real service directly.
    """
    from apps.routines.models import Routine
    from apps.routines.services.exercisedb_service import enrich_routine

    backfilled = 0
    for routine in Routine.all_objects.only("id"):  # only(id): later columns do not exist yet at this point in history
        backfilled += enrich_routine(routine)

    if backfilled:
        print(f"Re-enriched {backfilled} exercises while backfilling source_external_id")


class Migration(migrations.Migration):

    dependencies = [
        ("routines", "0005_routine_source_and_manual_support"),
    ]

    operations = [
        migrations.RunPython(
            backfill_source_external_id, reverse_code=migrations.RunPython.noop, atomic=True
        ),
    ]
