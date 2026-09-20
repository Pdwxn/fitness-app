"""Every catalog-matched routine exercise should carry its demo (gif) URL."""
import importlib

import pytest
from django.apps import apps as django_apps

from apps.routines.models import RoutineExercise, StoredExercise
from apps.routines.services.exercisedb_service import enrich_exercise
from apps.routines.services.generation_service import persist_manual_routine
from apps.users.models import UserProfile

GIF = (
    "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset"
    "@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/0001-abc.gif"
)


def make_catalog_exercise(**overrides):
    fields = dict(
        external_id="ext-bp",
        name="Bench Press",
        image_paths=["0001-abc.jpg"],
        gif_path="0001-abc.gif",
        image_provider="exercises-dataset",
    )
    fields.update(overrides)
    return StoredExercise.objects.create(**fields)


def routine_exercise(name="Overhead Press", **overrides):
    user = UserProfile.objects.create(full_name="Demo Test")
    routine = persist_manual_routine(
        user,
        {
            "weeks": [
                {
                    "week_number": 1,
                    "days": [
                        {
                            "day_number": 1,
                            "day_name": "A",
                            "exercises": [{"name": name, "sets": 3, "reps": "8"}],
                        }
                    ],
                }
            ]
        },
    )
    exercise = RoutineExercise.objects.get(day__week__routine=routine)
    for field, value in overrides.items():
        setattr(exercise, field, value)
    exercise.save()
    return exercise


@pytest.mark.django_db
class TestDemoUrlOnEnrichment:
    def test_name_matched_exercise_gets_the_demo_url(self):
        make_catalog_exercise()
        exercise = routine_exercise(search_term="Bench Press")

        enrich_exercise(exercise)

        exercise.refresh_from_db()
        assert exercise.source_external_id == "ext-bp"
        assert exercise.video_url == GIF

    def test_catalog_fast_path_still_gets_it(self):
        make_catalog_exercise()
        exercise = routine_exercise(source_external_id="ext-bp")

        enrich_exercise(exercise)

        exercise.refresh_from_db()
        assert exercise.video_url == GIF

    def test_no_demo_when_the_catalog_entry_has_no_gif(self):
        make_catalog_exercise(gif_path="", image_provider="free-exercise-db")
        exercise = routine_exercise(search_term="Bench Press")

        enrich_exercise(exercise)

        exercise.refresh_from_db()
        assert exercise.video_url == ""


@pytest.mark.django_db
class TestBackfillMigration:
    def run_backfill(self):
        module = importlib.import_module("apps.routines.migrations.0010_backfill_demo_urls")
        module.backfill_demo_urls(django_apps, None)

    def test_fills_identified_exercises_without_a_demo(self):
        make_catalog_exercise()
        exercise = routine_exercise(source_external_id="ext-bp", video_url="")

        self.run_backfill()

        exercise.refresh_from_db()
        assert exercise.video_url == GIF

    def test_leaves_existing_urls_and_unidentified_exercises_alone(self):
        make_catalog_exercise()
        keep = routine_exercise(source_external_id="ext-bp", video_url="https://example.com/x.gif")
        other = routine_exercise(source_external_id="", video_url="")

        self.run_backfill()

        keep.refresh_from_db()
        other.refresh_from_db()
        assert keep.video_url == "https://example.com/x.gif"
        assert other.video_url == ""
