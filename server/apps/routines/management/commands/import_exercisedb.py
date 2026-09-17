import json
import os

from django.core.management.base import BaseCommand

from apps.routines.services.exercise_sync import sync_exercises

HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Command(BaseCommand):
    help = (
        "Import/sync exercises from exercises_db_v2.json into StoredExercise. "
        "Upserts by external_id: only rows whose tracked fields actually "
        "changed get a bumped updated_at (so GET /api/v1/exercises/"
        "?updated_since= can delta-sync instead of downloading the whole "
        "catalog every time). Exercises missing from this run are "
        "soft-deleted; ones that reappear are restored."
    )

    def handle(self, *args, **options):
        path = os.path.join(HERE, "data", "exercises_db_v2.json")
        with open(path, encoding="utf-8") as f:
            source_entries = json.load(f)

        counts = sync_exercises(source_entries)

        self.stdout.write(
            self.style.SUCCESS(
                "Sync complete: "
                f"{counts['created']} created, {counts['updated']} updated "
                f"({counts['restored']} restored), {counts['unchanged']} unchanged, "
                f"{counts['removed']} soft-deleted. "
                f"Total active: {counts['active_total']}"
            )
        )
