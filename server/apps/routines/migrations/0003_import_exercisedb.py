import json
import os

from django.db import migrations

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def import_exercises(apps, schema_editor):
    StoredExercise = apps.get_model("routines", "StoredExercise")
    if StoredExercise.objects.exists():
        return

    path = os.path.join(HERE, "data", "exercises_db.json")
    with open(path, encoding="utf-8") as f:
        exercises = json.load(f)

    objects = [
        StoredExercise(
            external_id=ex["id"],
            name=ex["name"],
            force=ex.get("force") or "",
            level=ex.get("level") or "",
            mechanic=ex.get("mechanic") or "",
            equipment=ex.get("equipment") or "",
            primary_muscles=ex.get("primaryMuscles", []),
            secondary_muscles=ex.get("secondaryMuscles", []),
            instructions="\n".join(ex.get("instructions", []) or []),
            category=ex.get("category") or "",
            image_paths=ex.get("images", []),
        )
        for ex in exercises
    ]
    StoredExercise.objects.bulk_create(objects, ignore_conflicts=True)


def _clear_old_cdn_urls(apps):
    RoutineExercise = apps.get_model("routines", "RoutineExercise")

    old_count = RoutineExercise.objects.filter(image_url__contains="cdn.exercisedb.dev").count()
    if old_count:
        RoutineExercise.objects.filter(image_url__contains="cdn.exercisedb.dev").update(image_url="")
        print(f"Cleared {old_count} stale CDN image_urls")


def enrich_existing_routines(apps, schema_editor):
    Routine = apps.get_model("routines", "Routine")
    from apps.routines.services.exercisedb_service import enrich_routine

    _clear_old_cdn_urls(apps)

    total_exercises = 0
    for pk in Routine.objects.values_list("pk", flat=True):
        routine = Routine.objects.get(pk=pk)
        enriched = enrich_routine(routine)
        total_exercises += enriched

    if total_exercises:
        print(f"Enriched {total_exercises} exercises across all routines")


class Migration(migrations.Migration):

    dependencies = [
        ("routines", "0002_storedexercise"),
    ]

    operations = [
        migrations.RunPython(import_exercises, reverse_code=migrations.RunPython.noop, atomic=True),
        migrations.RunPython(enrich_existing_routines, reverse_code=migrations.RunPython.noop, atomic=True),
    ]
