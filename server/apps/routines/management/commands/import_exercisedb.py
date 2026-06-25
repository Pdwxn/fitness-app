import json
import os

from django.utils import timezone
from django.core.management.base import BaseCommand

from apps.routines.models import StoredExercise

HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Command(BaseCommand):
    help = "Import exercises from exercises_db.json into StoredExercise table"

    def handle(self, *args, **options):
        path = os.path.join(HERE, "data", "exercises_db.json")
        with open(path, encoding="utf-8") as f:
            exercises = json.load(f)

        self.stdout.write(f"Soft-deleting existing {StoredExercise.objects.count()} records...")
        StoredExercise.all_objects.update(deleted_at=timezone.now())

        objects = []
        for ex in exercises:
            objects.append(StoredExercise(
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
            ))

        StoredExercise.objects.bulk_create(objects, ignore_conflicts=True)

        total = StoredExercise.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f"Imported {total} exercises")
        )
