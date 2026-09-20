"""Editing a manual routine must never destroy the user's logged history.

``DailyLog.routine_day`` is ON DELETE CASCADE, and the edit used to rebuild
the whole weeks/days tree (delete + recreate), taking every log with it --
even when the routine was re-saved unchanged.
"""
import copy
from datetime import date

import pytest

from apps.progress.models import DailyLog
from apps.routines.models import Routine, RoutineDay, RoutineExercise, RoutineWeek
from apps.routines.services.generation_service import persist_manual_routine, update_manual_routine
from apps.users.models import UserProfile


def payload():
    return {
        "weeks": [
            {
                "week_number": 1,
                "focus": "Base",
                "days": [
                    {
                        "day_number": 1,
                        "day_name": "Push",
                        "exercises": [
                            {"name": "Bench Press", "external_id": "bench", "sets": 4, "reps": "8-10", "weight_kg": 60},
                            {"name": "Overhead Press", "sets": 3, "reps": "8-12"},
                        ],
                    },
                    {"day_number": 2, "day_name": "Rest", "is_rest_day": True, "exercises": []},
                    {
                        "day_number": 3,
                        "day_name": "Pull",
                        "exercises": [{"name": "Barbell Row", "sets": 4, "reps": "8-10"}],
                    },
                ],
            },
            {
                "week_number": 2,
                "days": [
                    {
                        "day_number": 1,
                        "day_name": "Push",
                        "exercises": [{"name": "Bench Press", "external_id": "bench", "sets": 4, "reps": "6-8"}],
                    }
                ],
            },
        ]
    }


@pytest.fixture
def user():
    return UserProfile.objects.create(full_name="Edit Test")


@pytest.fixture
def routine(user):
    return persist_manual_routine(user, payload())


def day_of(routine, week_number, day_number):
    return RoutineDay.objects.get(week__routine=routine, week__week_number=week_number, day_number=day_number)


def log(user, day, when=date(2026, 9, 1)):
    return DailyLog.objects.create(
        user=user,
        routine_day=day,
        date=when,
        completed=True,
        exercises_done=[
            {"exercise_id": str(e.id), "exercise_name": e.name, "completed": True}
            for e in day.exercises.all()
        ],
    )


@pytest.mark.django_db
class TestEditKeepsLogs:
    def test_resaving_an_unchanged_routine_keeps_every_log(self, user, routine):
        log(user, day_of(routine, 1, 1))
        log(user, day_of(routine, 1, 3), date(2026, 9, 2))
        log(user, day_of(routine, 2, 1), date(2026, 9, 3))

        update_manual_routine(routine, payload())

        assert DailyLog.objects.filter(user=user).count() == 3

    def test_logs_stay_attached_to_the_same_day_and_exercise_ids_survive(self, user, routine):
        day = day_of(routine, 1, 1)
        original_log = log(user, day)
        exercise_ids = set(day.exercises.values_list("id", flat=True))

        edited = payload()
        edited["weeks"][0]["days"][0]["exercises"][0]["sets"] = 5
        edited["weeks"][0]["days"][0]["exercises"][0]["weight_kg"] = 65
        update_manual_routine(routine, edited)

        original_log.refresh_from_db()
        assert original_log.routine_day_id == day.id
        day = day_of(routine, 1, 1)
        assert set(day.exercises.values_list("id", flat=True)) == exercise_ids
        bench = day.exercises.get(name="Bench Press")
        assert (bench.sets, float(bench.weight_kg)) == (5, 65.0)
        # the id the log entries point at still exists
        assert RoutineExercise.objects.filter(id=original_log.exercises_done[0]["exercise_id"]).exists()

    def test_reordering_and_renaming_keep_matched_rows(self, user, routine):
        day = day_of(routine, 1, 1)
        bench_id = day.exercises.get(name="Bench Press").id
        log(user, day)

        edited = payload()
        first_day = edited["weeks"][0]["days"][0]
        first_day["exercises"].reverse()  # Overhead first, Bench second
        update_manual_routine(routine, edited)

        rows = list(day_of(routine, 1, 1).exercises.order_by("order"))
        assert [r.name for r in rows] == ["Overhead Press", "Bench Press"]
        assert [r.order for r in rows] == [1, 2]
        assert rows[1].id == bench_id
        assert DailyLog.objects.count() == 1

    def test_removed_exercise_is_gone_but_history_keeps_its_log(self, user, routine):
        day = day_of(routine, 1, 1)
        log(user, day)

        edited = payload()
        edited["weeks"][0]["days"][0]["exercises"].pop(1)  # drop Overhead Press
        update_manual_routine(routine, edited)

        assert list(day_of(routine, 1, 1).exercises.values_list("name", flat=True)) == ["Bench Press"]
        assert DailyLog.objects.count() == 1

    def test_new_exercises_are_added(self, user, routine):
        edited = payload()
        edited["weeks"][0]["days"][0]["exercises"].append({"name": "Dips", "sets": 3, "reps": "10"})
        update_manual_routine(routine, edited)

        rows = list(day_of(routine, 1, 1).exercises.order_by("order"))
        assert [r.name for r in rows] == ["Bench Press", "Overhead Press", "Dips"]
        assert [r.order for r in rows] == [1, 2, 3]

    def test_removed_day_keeps_its_logs_and_disappears_from_the_routine(self, user, routine):
        pull = day_of(routine, 1, 3)
        pull_log = log(user, pull)

        edited = payload()
        edited["weeks"][0]["days"].pop(2)  # drop the Pull day
        update_manual_routine(routine, edited)

        assert not RoutineDay.objects.filter(week__routine=routine, week__week_number=1, day_number=3).exists()
        assert DailyLog.objects.filter(id=pull_log.id).exists()

    def test_a_removed_day_can_be_added_back_and_gets_its_logs_back(self, user, routine):
        pull = day_of(routine, 1, 3)
        pull_log = log(user, pull)

        without = payload()
        without["weeks"][0]["days"].pop(2)
        update_manual_routine(routine, without)
        update_manual_routine(routine, payload())

        restored = day_of(routine, 1, 3)
        assert restored.id == pull.id
        pull_log.refresh_from_db()
        assert pull_log.routine_day_id == restored.id

    def test_removed_week_keeps_its_logs(self, user, routine):
        week2_log = log(user, day_of(routine, 2, 1))

        one_week = copy.deepcopy(payload())
        one_week["weeks"].pop(1)
        update_manual_routine(routine, one_week)

        assert RoutineWeek.objects.filter(routine=routine).count() == 1
        assert DailyLog.objects.filter(id=week2_log.id).exists()

    def test_edit_still_produces_the_exact_tree_the_payload_describes(self, user, routine):
        edited = payload()
        edited["weeks"][0]["days"][1] = {
            "day_number": 2,
            "day_name": "Legs",
            "exercises": [{"name": "Squat", "sets": 5, "reps": "5"}],
        }
        update_manual_routine(routine, edited)

        day = day_of(routine, 1, 2)
        assert (day.day_name, day.is_rest_day) == ("Legs", False)
        assert list(day.exercises.values_list("name", flat=True)) == ["Squat"]

        back = payload()  # toggle it back to a rest day
        update_manual_routine(routine, back)
        day = day_of(routine, 1, 2)
        assert day.is_rest_day is True
        assert day.exercises.count() == 0

    def test_routine_identity_and_activity_are_unchanged(self, user, routine):
        update_manual_routine(routine, payload())
        routine.refresh_from_db()
        assert routine.is_active
        assert Routine.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_soft_deleted_days_and_weeks_do_not_appear_in_the_api_output(user, routine):
    from apps.routines.serializers import RoutineSerializer

    edited = copy.deepcopy(payload())
    edited["weeks"].pop(1)
    edited["weeks"][0]["days"].pop(2)
    update_manual_routine(routine, edited)

    routine = Routine.objects.prefetch_related("weeks__days__exercises").get(pk=routine.pk)
    data = RoutineSerializer(routine).data
    assert [w["week_number"] for w in data["weeks"]] == [1]
    assert [d["day_number"] for d in data["weeks"][0]["days"]] == [1, 2]
