from django.db import migrations

from apps.routines.services.exercisedb_service import resolve_gif_url


def backfill_demo_urls(apps, schema_editor):
    """Gives already-enriched routine exercises their demo (gif) URL.

    Until now only exercises picked from the catalog in the manual builder got
    one; AI-routine exercises matched by name had an image but no demo. Uses
    historical models (so it keeps working as the schema evolves) and the pure
    ``resolve_gif_url`` function, which only reads attributes.
    """
    RoutineExercise = apps.get_model("routines", "RoutineExercise")
    StoredExercise = apps.get_model("routines", "StoredExercise")

    gif_by_external_id = {}
    for stored in StoredExercise.objects.exclude(gif_path="").filter(deleted_at__isnull=True):
        url = resolve_gif_url(stored)
        if url:
            gif_by_external_id[stored.external_id] = url

    updated = 0
    rows = RoutineExercise.objects.filter(video_url="").exclude(source_external_id="")
    for row in rows.only("id", "source_external_id", "video_url"):
        url = gif_by_external_id.get(row.source_external_id)
        if url:
            RoutineExercise.objects.filter(pk=row.pk).update(video_url=url)
            updated += 1

    if updated:
        print(f"Backfilled demo URLs for {updated} routine exercises")


class Migration(migrations.Migration):

    dependencies = [
        ("routines", "0009_ai_coach_proposals"),
    ]

    operations = [
        migrations.RunPython(backfill_demo_urls, reverse_code=migrations.RunPython.noop),
    ]
