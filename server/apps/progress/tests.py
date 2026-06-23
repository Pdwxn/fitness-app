import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.routines.models import Routine, RoutineDay, RoutineWeek
from apps.users.models import UserProfile


@pytest.mark.django_db
class TestDailyLogBatch:
    def _setup(self):
        user = UserProfile.objects.create(id="00000000-0000-0000-0000-000000000001")
        routine = Routine.objects.create(
            user=user,
            month=6,
            year=2026,
            is_active=True,
        )
        week = RoutineWeek.objects.create(
            routine=routine,
            week_number=1,
        )
        day = RoutineDay.objects.create(
            week=week,
            day_number=1,
            day_name="Push",
        )
        return user, day

    def test_upsert_creates_new_log(self):
        user, day = self._setup()
        client = APIClient()
        client.force_authenticate(user=user)

        payload = {
            "logs": [
                {
                    "routine_day_id": str(day.id),
                    "date": "2026-06-23",
                    "completed": True,
                    "day_note": "Good session",
                    "exercises_done": [
                        {
                            "exercise_id": "00000000-0000-0000-0000-000000000010",
                            "exercise_name": "Push-up",
                            "completed": True,
                            "actual_sets": 3,
                            "actual_reps": "12",
                            "actual_weight_kg": None,
                            "note": "",
                        },
                    ],
                },
            ],
        }

        response = client.post(
            reverse("progress-logs-batch"),
            payload,
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created"] == 1
        assert data["updated"] == 0
        assert len(data["logs"]) == 1

    def test_upsert_updates_existing_log(self):
        user, day = self._setup()
        client = APIClient()
        client.force_authenticate(user=user)

        payload = {
            "logs": [
                {
                    "routine_day_id": str(day.id),
                    "date": "2026-06-23",
                    "completed": True,
                    "day_note": "First entry",
                    "exercises_done": [],
                },
            ],
        }

        client.post(reverse("progress-logs-batch"), payload, format="json")

        update_payload = {
            "logs": [
                {
                    "routine_day_id": str(day.id),
                    "date": "2026-06-23",
                    "completed": True,
                    "day_note": "Updated entry",
                    "exercises_done": [],
                },
            ],
        }

        response = client.post(
            reverse("progress-logs-batch"),
            update_payload,
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created"] == 0
        assert data["updated"] == 1
        assert data["logs"][0]["day_note"] == "Updated entry"
