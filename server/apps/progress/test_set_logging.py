"""Per-set logging: the API stores and returns `sets`, and stays compatible with the aggregate-only shape."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.progress.models import DailyLog
from apps.routines.models import Routine, RoutineDay, RoutineWeek
from apps.users.models import UserProfile

EXERCISE_ID = "00000000-0000-0000-0000-000000000010"


@pytest.fixture
def setup():
    user = UserProfile.objects.create(full_name="Sets Test")
    routine = Routine.objects.create(user=user, month=6, year=2026, is_active=True)
    week = RoutineWeek.objects.create(routine=routine, week_number=1)
    day = RoutineDay.objects.create(week=week, day_number=1, day_name="Push")
    client = APIClient()
    client.force_authenticate(user=user)
    return user, day, client


def post_log(client, day, exercise):
    payload = {
        "logs": [
            {
                "routine_day_id": str(day.id),
                "date": "2026-06-23",
                "completed": True,
                "day_note": "",
                "exercises_done": [
                    {"exercise_id": EXERCISE_ID, "exercise_name": "Bench Press", "note": "", **exercise}
                ],
            }
        ]
    }
    return client.post(reverse("progress-logs-batch"), payload, format="json")


@pytest.mark.django_db
class TestPerSetLogging:
    def test_sets_are_stored_and_returned_alongside_the_derived_totals(self, setup):
        user, day, client = setup
        response = post_log(
            client,
            day,
            {
                "sets": [
                    {"reps": "10", "weight_kg": "62.5", "completed": True},
                    {"reps": "9", "weight_kg": "62.5", "completed": True},
                    {"reps": None, "weight_kg": "62.5", "completed": False},
                ],
                "completed": False,
                "actual_sets": 2,
                "actual_reps": "10,9",
                "actual_weight_kg": "62.5",
            },
        )

        assert response.status_code == 200, response.content
        entry = response.json()["logs"][0]["exercises_done"][0]
        assert entry["sets"] == [
            {"reps": "10", "weight_kg": "62.50", "completed": True},
            {"reps": "9", "weight_kg": "62.50", "completed": True},
            {"reps": None, "weight_kg": "62.50", "completed": False},
        ]
        assert (entry["actual_sets"], entry["actual_reps"], entry["actual_weight_kg"]) == (2, "10,9", "62.50")

        stored = DailyLog.objects.get(user=user).exercises_done[0]
        assert len(stored["sets"]) == 3
        assert stored["completed"] is False

    def test_the_old_aggregate_only_shape_still_works_and_has_no_sets(self, setup):
        user, day, client = setup
        response = post_log(
            client,
            day,
            {"completed": True, "actual_sets": 3, "actual_reps": "10", "actual_weight_kg": "60"},
        )

        assert response.status_code == 200, response.content
        stored = DailyLog.objects.get(user=user).exercises_done[0]
        assert "sets" not in stored
        assert stored["actual_reps"] == "10"

    def test_derived_reps_for_a_long_workout_fit(self, setup):
        _, day, client = setup
        reps = ",".join(["12"] * 20)  # 59 chars: the old 40-char limit would have rejected this
        assert post_log(client, day, {"completed": True, "actual_reps": reps}).status_code == 200

    def test_absurd_reps_totals_are_rejected(self, setup):
        _, day, client = setup
        assert post_log(client, day, {"actual_reps": "1" * 121}).status_code == 400

    @pytest.mark.parametrize(
        "bad_set",
        [
            {"reps": "10", "weight_kg": "62.123", "completed": True},  # > 2 decimals
            {"reps": "10", "weight_kg": "-5", "completed": True},
            {"reps": "10", "weight_kg": "heavy", "completed": True},
            {"reps": "1" * 21, "weight_kg": "60", "completed": True},
        ],
    )
    def test_malformed_sets_are_rejected(self, setup, bad_set):
        _, day, client = setup
        assert post_log(client, day, {"sets": [bad_set]}).status_code == 400

    def test_too_many_sets_are_rejected(self, setup):
        _, day, client = setup
        sets = [{"reps": "10", "weight_kg": "60", "completed": True}] * 21
        assert post_log(client, day, {"sets": sets}).status_code == 400
        assert post_log(client, day, {"sets": sets[:20]}).status_code == 200

    def test_a_set_defaults_to_not_completed(self, setup):
        user, day, client = setup
        assert post_log(client, day, {"sets": [{"reps": "10", "weight_kg": "60"}]}).status_code == 200
        assert DailyLog.objects.get(user=user).exercises_done[0]["sets"][0]["completed"] is False
