import json
import os

from django.db import migrations

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def import_exercises_v2(apps, schema_editor):
    """Switches the exercise catalog from free-exercise-db to exercises-dataset.

    Uses the real ``sync_exercises`` (not historical models) so the diffing
    logic stays in one place -- same precedent as ``0003_import_exercisedb``
    importing ``enrich_routine`` directly. Rows from the old dataset simply
    fall out of ``sync_exercises``'s incoming set and get soft-deleted.
    """
    from apps.routines.services.exercise_sync import sync_exercises

    path = os.path.join(HERE, "data", "exercises_db_v2.json")
    with open(path, encoding="utf-8") as f:
        source_entries = json.load(f)

    counts = sync_exercises(source_entries)
    print(
        "Switched exercise catalog to exercises-dataset: "
        f"{counts['created']} created, {counts['updated']} updated, "
        f"{counts['removed']} soft-deleted (old dataset). "
        f"Total active: {counts['active_total']}"
    )


def enrich_existing_routines(apps, schema_editor):
    # Real model (not the historical one from apps.get_model): enrich_routine
    # queries RoutineExercise through the real model class, and Django's ORM
    # rejects a historical-model instance there ("Must be Routine instance").
    from apps.routines.models import Routine
    from apps.routines.services.exercisedb_service import enrich_routine

    total_exercises = 0
    for routine in Routine.all_objects.only("id"):  # only(id): later columns do not exist yet at this point in history
        enriched = enrich_routine(routine)
        total_exercises += enriched

    if total_exercises:
        print(f"Re-enriched {total_exercises} exercises against the new dataset")


class Migration(migrations.Migration):

    dependencies = [
        ("routines", "0006_storedexercise_gif_path"),
    ]

    operations = [
        migrations.RunPython(import_exercises_v2, reverse_code=migrations.RunPython.noop, atomic=True),
        migrations.RunPython(enrich_existing_routines, reverse_code=migrations.RunPython.noop, atomic=True),
    ]
