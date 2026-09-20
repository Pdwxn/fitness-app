from datetime import date

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.routines.services.generation_service import persist_manual_routine
from apps.users.models import UserProfile


@pytest.mark.django_db
def test_active_routine_exposes_cycle_started_on_for_the_weekly_schedule():
    user = UserProfile.objects.create(full_name="Cycle Test")
    routine = persist_manual_routine(
        user,
        {"weeks": [{"week_number": 1, "days": [{"day_number": 1, "day_name": "A", "exercises": [{"name": "Squat", "sets": 3, "reps": "8"}]}]}]},
    )
    client = APIClient()
    client.force_authenticate(user=user)

    assert client.get(reverse("active-routine")).json()["cycle_started_on"] is None

    routine.cycle_started_on = date(2026, 9, 1)
    routine.save()
    assert client.get(reverse("active-routine")).json()["cycle_started_on"] == "2026-09-01"
