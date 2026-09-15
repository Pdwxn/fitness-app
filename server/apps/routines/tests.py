import json
import time

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.profiles.models import UserHealthData
from apps.routines.models import (
    Routine,
    RoutineDay,
    RoutineExercise,
    RoutineWeek,
    StoredExercise,
)
from apps.routines.services import exercise_sync, generation_service
from apps.routines.services.generation_service import (
    ActiveManualRoutineError,
    persist_manual_routine,
    persist_routine,
)
from apps.users.models import UserProfile


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def make_user(**overrides):
    defaults = dict(
        full_name="Test User",
        gender="male",
        age=30,
        weight_kg="80.00",
        height_cm="180.00",
        experience_level="intermediate",
        training_style="hypertrophy",
        intensity_preference="near_failure",
        days_per_week=4,
        session_duration_minutes=60,
    )
    defaults.update(overrides)
    return UserProfile.objects.create(**defaults)


def make_onboarded_user(**overrides):
    user = make_user(**overrides)
    UserHealthData.objects.create(
        user=user,
        activity_level="moderate",
        equipment_type="gym",
        routine_type="push_pull_legs",
        physical_goals=["hypertrophy"],
    )
    return user


def manual_payload():
    return {
        "weeks": [
            {
                "week_number": 1,
                "focus": "Base",
                "notes": "",
                "days": [
                    {
                        "day_number": 1,
                        "day_name": "Push",
                        "is_rest_day": False,
                        "exercises": [
                            {"name": "Bench Press", "external_id": "Bench_Press", "sets": 4, "reps": "8-10"},
                            {"name": "Overhead Press", "sets": 3, "reps": "8-12"},
                        ],
                    },
                    {
                        "day_number": 2,
                        "day_name": "Rest",
                        "is_rest_day": True,
                        "exercises": [],
                    },
                    {
                        "day_number": 3,
                        "day_name": "Pull",
                        "is_rest_day": False,
                        "exercises": [
                            {"name": "Barbell Row", "sets": 4, "reps": "8-10"},
                        ],
                    },
                ],
            }
        ]
    }


def ai_payload():
    weeks = []
    for w in range(1, 5):
        days = []
        for d in range(1, 8):
            rest = d in (4, 7)
            days.append(
                {
                    "day_number": d,
                    "day_name": "Rest" if rest else f"Day {d}",
                    "is_rest_day": rest,
                    "exercises": []
                    if rest
                    else [{"name": "Squat", "sets": 3, "reps": "8", "order": 1}],
                }
            )
        weeks.append({"week_number": w, "focus": f"W{w}", "notes": "", "days": days})
    return {"weeks": weeks}


@pytest.fixture
def stub_gemini(monkeypatch):
    monkeypatch.setattr(generation_service, "build_routine_prompt", lambda *a, **k: "prompt")
    monkeypatch.setattr(
        generation_service,
        "generate_routine_with_gemini",
        lambda *a, **k: json.dumps(ai_payload()),
    )


# --------------------------------------------------------------------------- #
# manual routine creation
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestManualRoutineCreation:
    def test_create_without_month_year(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(reverse("manual-routine"), manual_payload(), format="json")

        assert response.status_code == 201, response.content
        data = response.json()
        assert data["source"] == "manual"
        assert data["month"] is None
        assert data["year"] is None
        assert data["is_active"] is True
        assert len(data["weeks"]) == 1
        assert len(data["weeks"][0]["days"]) == 3

    def test_external_id_is_persisted(self):
        user = make_user()
        routine = persist_manual_routine(user, manual_payload())
        ex = RoutineExercise.objects.get(day__week__routine=routine, name="Bench Press")
        assert ex.source_external_id == "Bench_Press"

    def test_creating_manual_deactivates_previous_active(self):
        user = make_user()
        old = persist_routine(user, ai_payload(), source=Routine.Source.AI_GENERATED, today=None)
        assert old.is_active is True

        new = persist_manual_routine(user, manual_payload())

        old.refresh_from_db()
        assert old.is_active is False
        assert new.is_active is True
        assert Routine.objects.filter(user=user, is_active=True).count() == 1

    def test_rejects_week_without_training_day(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)
        payload = manual_payload()
        for day in payload["weeks"][0]["days"]:
            day["is_rest_day"] = True
            day["exercises"] = []

        response = client.post(reverse("manual-routine"), payload, format="json")
        assert response.status_code == 400

    def test_rejects_training_day_without_exercises(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)
        payload = manual_payload()
        payload["weeks"][0]["days"][0]["exercises"] = []

        response = client.post(reverse("manual-routine"), payload, format="json")
        assert response.status_code == 400

    def test_rejects_more_than_four_weeks(self):
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)
        payload = manual_payload()
        base_week = payload["weeks"][0]
        payload["weeks"] = [dict(base_week, week_number=n) for n in range(1, 6)]

        response = client.post(reverse("manual-routine"), payload, format="json")
        assert response.status_code == 400


# --------------------------------------------------------------------------- #
# single active routine invariant
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestSingleActiveRoutine:
    def test_two_manual_routines_same_user_only_one_active(self):
        user = make_user()
        persist_manual_routine(user, manual_payload())
        persist_manual_routine(user, manual_payload())
        assert Routine.objects.filter(user=user, is_active=True).count() == 1
        assert Routine.all_objects.filter(user=user).count() == 2

    def test_manual_routines_do_not_collide_on_month_year(self):
        # The unique (user, month, year) constraint only applies to source=ai_generated.
        user = make_user()
        r1 = persist_manual_routine(user, manual_payload())
        r2 = persist_manual_routine(user, manual_payload())
        assert r1.id != r2.id  # no IntegrityError raised


# --------------------------------------------------------------------------- #
# AI generation vs active manual routine
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestAIGenerationGuard:
    def test_generate_blocked_by_active_manual_routine(self, stub_gemini):
        user = make_onboarded_user()
        persist_manual_routine(user, manual_payload())

        with pytest.raises(ActiveManualRoutineError):
            generation_service.generate_monthly_routine_if_needed(user, return_existing=False)

    def test_generate_works_after_deactivating_manual(self, stub_gemini):
        user = make_onboarded_user()
        manual = persist_manual_routine(user, manual_payload())
        manual.is_active = False
        manual.save(update_fields=["is_active"])

        routine, created = generation_service.generate_monthly_routine_if_needed(
            user, return_existing=False
        )
        assert created is True
        assert routine.source == Routine.Source.AI_GENERATED
        assert routine.month is not None
        assert Routine.objects.filter(user=user, is_active=True).count() == 1

    def test_generate_view_returns_409_with_code(self, stub_gemini):
        user = make_onboarded_user()
        persist_manual_routine(user, manual_payload())
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(reverse("generate-routine"))
        assert response.status_code == 409
        assert response.json()["code"] == "active_manual_routine"


# --------------------------------------------------------------------------- #
# deactivate endpoint
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestDeactivateRoutine:
    def test_deactivate_active_routine(self):
        user = make_user()
        routine = persist_manual_routine(user, manual_payload())
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(reverse("routine-deactivate", args=[routine.id]))
        assert response.status_code == 204
        routine.refresh_from_db()
        assert routine.is_active is False

    def test_cannot_deactivate_another_users_routine(self):
        owner = make_user(full_name="Owner")
        other = make_user(full_name="Other")
        routine = persist_manual_routine(owner, manual_payload())
        client = APIClient()
        client.force_authenticate(user=other)

        response = client.post(reverse("routine-deactivate", args=[routine.id]))
        assert response.status_code == 404
        routine.refresh_from_db()
        assert routine.is_active is True


# --------------------------------------------------------------------------- #
# exercise catalog
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestExerciseCatalog:
    def _make_exercises(self, n):
        # Migration 0003 seeds the full catalog; start from a clean slate.
        StoredExercise.all_objects.all().delete()
        for i in range(n):
            StoredExercise.objects.create(
                external_id=f"ex-{i:03d}",
                name=f"Exercise {i}",
                primary_muscles=["chest"],
                equipment="barbell",
                category="strength",
                image_paths=[f"Exercise_{i}/0.jpg"],
            )

    def test_lists_exercises_with_resolved_image(self):
        self._make_exercises(3)
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(reverse("exercise-catalog"))
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 3
        first = data["results"][0]
        assert first["image_url"].startswith("https://raw.githubusercontent.com/yuhonas/")
        assert first["image_url"].endswith("Exercise_0/0.jpg")
        assert first["gif_url"] == ""

    def test_pagination(self):
        self._make_exercises(5)
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(reverse("exercise-catalog"), {"page_size": 2})
        data = response.json()
        assert data["count"] == 5
        assert len(data["results"]) == 2
        assert data["next"] is not None

    def test_excludes_soft_deleted(self):
        self._make_exercises(2)
        StoredExercise.all_objects.filter(external_id="ex-000").update(
            deleted_at="2020-01-01T00:00:00Z"
        )
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(reverse("exercise-catalog"))
        assert response.json()["count"] == 1

    def test_updated_since_filters_to_changed_rows(self):
        self._make_exercises(3)
        cutoff = timezone.now()
        StoredExercise.objects.filter(external_id="ex-001").update(updated_at=timezone.now())

        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(
            reverse("exercise-catalog"), {"updated_since": cutoff.isoformat()}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["results"][0]["external_id"] == "ex-001"

    def test_updated_since_invalid_format_is_400(self):
        self._make_exercises(1)
        user = make_user()
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(reverse("exercise-catalog"), {"updated_since": "not-a-date"})
        assert response.status_code == 400


# --------------------------------------------------------------------------- #
# exercise_sync.sync_exercises (importer diffing logic)
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestExerciseSync:
    def _entry(self, ext_id, **overrides):
        entry = {
            "id": ext_id,
            "name": f"Exercise {ext_id}",
            "body_part": "chest",
            "equipment": "barbell",
            "primary_muscles": ["chest"],
            "secondary_muscles": [],
            "instructions": "Step 1\nStep 2",
            "img": f"{ext_id}-0.jpg",
            "gif": f"{ext_id}-0.gif",
        }
        entry.update(overrides)
        return entry

    def setup_method(self):
        StoredExercise.all_objects.all().delete()

    def test_creates_new_exercises(self):
        counts = exercise_sync.sync_exercises([self._entry("a"), self._entry("b")])
        assert counts == {
            "created": 2, "updated": 0, "restored": 0, "unchanged": 0,
            "removed": 0, "active_total": 2,
        }
        ex = StoredExercise.objects.get(external_id="a")
        assert ex.instructions == "Step 1\nStep 2"
        assert ex.primary_muscles == ["chest"]

    def test_second_identical_run_is_a_no_op(self):
        entries = [self._entry("a"), self._entry("b")]
        exercise_sync.sync_exercises(entries)
        original_updated_at = StoredExercise.objects.get(external_id="a").updated_at

        time.sleep(0.01)
        counts = exercise_sync.sync_exercises(entries)

        assert counts["created"] == 0
        assert counts["updated"] == 0
        assert counts["unchanged"] == 2
        assert StoredExercise.objects.get(external_id="a").updated_at == original_updated_at

    def test_changed_field_bumps_updated_at(self):
        exercise_sync.sync_exercises([self._entry("a")])
        original_updated_at = StoredExercise.objects.get(external_id="a").updated_at

        time.sleep(0.01)
        counts = exercise_sync.sync_exercises([self._entry("a", equipment="dumbbell")])

        assert counts["updated"] == 1
        assert counts["unchanged"] == 0
        ex = StoredExercise.objects.get(external_id="a")
        assert ex.equipment == "dumbbell"
        assert ex.updated_at > original_updated_at

    def test_removed_from_source_is_soft_deleted(self):
        exercise_sync.sync_exercises([self._entry("a"), self._entry("b")])
        counts = exercise_sync.sync_exercises([self._entry("a")])

        assert counts["removed"] == 1
        assert counts["active_total"] == 1
        assert StoredExercise.objects.filter(external_id="b").count() == 0
        assert StoredExercise.all_objects.get(external_id="b").deleted_at is not None

    def test_reappearing_exercise_is_restored(self):
        exercise_sync.sync_exercises([self._entry("a"), self._entry("b")])
        exercise_sync.sync_exercises([self._entry("a")])  # "b" soft-deleted
        assert StoredExercise.objects.filter(external_id="b").count() == 0

        counts = exercise_sync.sync_exercises([self._entry("a"), self._entry("b")])

        assert counts["restored"] == 1
        ex = StoredExercise.objects.get(external_id="b")
        assert ex.deleted_at is None


# --------------------------------------------------------------------------- #
# resolve_image_url
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestResolveImageUrl:
    def test_free_exercise_db_provider(self):
        from apps.routines.services.exercisedb_service import resolve_image_url

        ex = StoredExercise.objects.create(
            external_id="x", name="X", image_paths=["Foo/0.jpg"]
        )
        assert resolve_image_url(ex) == (
            "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Foo/0.jpg"
        )

    def test_empty_image_paths(self):
        from apps.routines.services.exercisedb_service import resolve_image_url

        ex = StoredExercise.objects.create(external_id="y", name="Y", image_paths=[])
        assert resolve_image_url(ex) == ""

    def test_exercises_dataset_provider(self):
        from apps.routines.services.exercisedb_service import resolve_gif_url, resolve_image_url

        ex = StoredExercise.objects.create(
            external_id="z",
            name="Z",
            image_paths=["0001-abc.jpg"],
            gif_path="0001-abc.gif",
            image_provider="exercises-dataset",
        )
        assert resolve_image_url(ex) == (
            "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset"
            "@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/0001-abc.jpg"
        )
        assert resolve_gif_url(ex) == (
            "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset"
            "@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/0001-abc.gif"
        )

    def test_gif_url_empty_when_no_gif_path(self):
        from apps.routines.services.exercisedb_service import resolve_gif_url

        ex = StoredExercise.objects.create(external_id="w", name="W")
        assert resolve_gif_url(ex) == ""


# --------------------------------------------------------------------------- #
# regression: AI persistence still stores gemini fields
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestAIPersistenceRegression:
    def test_persist_generated_routine_keeps_gemini_fields(self):
        user = make_user()
        routine = generation_service.persist_generated_routine(
            user, ai_payload(), raw_response='{"weeks": []}', prompt="the prompt"
        )
        assert routine.source == Routine.Source.AI_GENERATED
        assert routine.gemini_prompt_hash != ""
        assert routine.raw_gemini_response["parsed"]["weeks"]
        assert routine.month is not None and routine.year is not None

    def test_duplicate_ai_routine_same_month_raises(self):
        user = make_user()
        generation_service.persist_generated_routine(
            user, ai_payload(), raw_response="{}", prompt="p"
        )
        with pytest.raises(generation_service.MonthlyRoutineExistsError):
            generation_service.persist_generated_routine(
                user, ai_payload(), raw_response="{}", prompt="p"
            )


# --------------------------------------------------------------------------- #
# 'routine ready' push notification hook
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestRoutineReadyPushHook:
    def test_ai_generation_notifies_the_user(self):
        from unittest.mock import patch

        user = make_user()
        with patch(
            "apps.notifications.services.push_service.notify_routine_ready"
        ) as mock_notify:
            routine = generation_service.persist_generated_routine(
                user, ai_payload(), raw_response="{}", prompt="p"
            )

        mock_notify.assert_called_once_with(user, routine)

    def test_manual_creation_does_not_notify(self):
        from unittest.mock import patch

        user = make_user()
        with patch(
            "apps.notifications.services.push_service.notify_routine_ready"
        ) as mock_notify:
            persist_manual_routine(user, manual_payload())

        mock_notify.assert_not_called()

    def test_a_broken_push_service_does_not_fail_generation(self):
        from unittest.mock import patch

        user = make_user()
        with patch(
            "apps.notifications.services.push_service.notify_routine_ready",
            side_effect=RuntimeError("push provider is down"),
        ):
            routine = generation_service.persist_generated_routine(
                user, ai_payload(), raw_response="{}", prompt="p"
            )

        assert routine.source == Routine.Source.AI_GENERATED
