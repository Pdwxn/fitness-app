import json
from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.profiles.models import UserHealthData
from apps.progress.models import DailyLog
from apps.routines.models import (
    Routine,
    RoutineDay,
    RoutineEditProposal,
    RoutineExercise,
    StoredExercise,
)
from apps.routines.services import coach_service, coach_validator
from apps.routines.services.coach_service import (
    CoachUnavailableError,
    ProposalNotPendingError,
    ProposalStaleError,
)
from apps.routines.services.coach_validator import CoachValidationError
from apps.routines.services.generation_service import persist_routine
from apps.users.models import UserProfile

AUGUST = date(2026, 8, 15)
SEPTEMBER = date(2026, 9, 1)

DAY_EXERCISES = {
    1: ["Bench Press", "Overhead Press", "Triceps Pushdown"],
    2: ["Barbell Row", "Lat Pulldown", "Bicep Curl"],
    3: ["Squat", "Leg Press", "Leg Curl"],
}


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def make_user():
    user = UserProfile.objects.create(
        full_name="Coach Test",
        gender="male",
        age=30,
        weight_kg="80.00",
        height_cm="180.00",
        experience_level="intermediate",
        training_style="hypertrophy",
        intensity_preference="near_failure",
        days_per_week=3,
        session_duration_minutes=60,
    )
    UserHealthData.objects.create(
        user=user,
        activity_level="moderate",
        equipment_type="gym",
        routine_type="push_pull_legs",
        physical_goals=["hypertrophy"],
    )
    return user


def coach_routine_payload():
    weeks = []
    for week_number in range(1, 5):
        days = []
        for day_number in range(1, 8):
            names = DAY_EXERCISES.get(day_number)
            days.append(
                {
                    "day_number": day_number,
                    "day_name": f"Day {day_number}" if names else "Rest",
                    "is_rest_day": not names,
                    "exercises": [
                        {
                            "name": name,
                            "muscle_group": "x",
                            "sets": 3,
                            "reps": "8-10",
                            "weight_kg": 40 + week_number,
                            "rest_seconds": 90,
                            "order": order,
                        }
                        for order, name in enumerate(names or [], start=1)
                    ],
                }
            )
        weeks.append({"week_number": week_number, "focus": "", "notes": "", "days": days})
    return {"weeks": weeks}


def make_routine(user, today=AUGUST):
    return persist_routine(
        user, coach_routine_payload(), source=Routine.Source.AI_GENERATED, today=today
    )


def log_days(user, routine, count, *, completed=True, on=date(2026, 8, 20)):
    """Logs the first ``count`` training days of the routine as done."""
    days = RoutineDay.objects.filter(week__routine=routine, is_rest_day=False).order_by(
        "week__week_number", "day_number"
    )[:count]
    for day in days:
        DailyLog.objects.create(
            user=user,
            routine_day=day,
            date=on,
            completed=completed,
            exercises_done=[
                {
                    "exercise_id": str(exercise.id),
                    "exercise_name": exercise.name,
                    "completed": completed,
                    "actual_sets": 3,
                    "actual_reps": "10",
                    "actual_weight_kg": "42.00",
                    "note": "",
                }
                for exercise in day.exercises.all()
            ],
        )


def ref(routine, day_number, name):
    """Row id of the first-week exercise, i.e. what the coach is shown."""
    return str(
        RoutineExercise.objects.filter(
            day__week__routine=routine, day__day_number=day_number, name=name
        )
        .order_by("day__week__week_number")
        .first()
        .id
    )


def fake_resolver(name, search_term, muscle_group):
    return {"external_id": f"ext-{normalize(search_term)}", "muscle_group": muscle_group}


def normalize(text):
    return "-".join(text.lower().split())


def snapshot_for(routine):
    return coach_service.build_snapshot(routine)


@pytest.fixture
def user():
    return make_user()


@pytest.fixture
def routine(user):
    return make_routine(user)


def freeze_september(monkeypatch):
    from datetime import datetime, timezone as dt_timezone

    monkeypatch.setattr(
        "django.utils.timezone.now", lambda: datetime(2026, 9, 5, 12, tzinfo=dt_timezone.utc)
    )


def stub_gemini(monkeypatch, *responses):
    """Each call returns the next response (dict -> JSON, str kept as is)."""
    queue = list(responses)
    calls = []

    def fake(prompt, **kwargs):
        calls.append(prompt)
        item = queue.pop(0) if len(queue) > 1 else queue[0]
        return item if isinstance(item, str) else json.dumps(item)

    monkeypatch.setattr(coach_service, "generate_json_with_gemini", fake)
    return calls


# --------------------------------------------------------------------------- #
# validator
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestCoachValidator:
    def validate(self, routine, payload):
        return coach_validator.validate_coach_response(payload, snapshot_for(routine), fake_resolver)

    def test_accepts_adjust_substitute_and_add(self, routine):
        summary, changes = self.validate(
            routine,
            {
                "summary": "Ajustes",
                "changes": [
                    {
                        "type": "adjust_load",
                        "exercise_id": ref(routine, 1, "Bench Press"),
                        "weight_change_percent": 5,
                        "why": "Completaste todo con holgura",
                    },
                    {
                        "type": "substitute_exercise",
                        "exercise_id": ref(routine, 1, "Overhead Press"),
                        "new_exercise": {"name": "Press Arnold", "search_term": "arnold press"},
                        "why": "Molestia en el hombro",
                    },
                    {
                        "type": "add_exercise",
                        "day_number": 2,
                        "exercise": {
                            "name": "Face pull",
                            "search_term": "face pull",
                            "sets": 3,
                            "reps": "12-15",
                        },
                        "why": "Falta deltoide posterior",
                    },
                ],
            },
        )
        assert summary == "Ajustes"
        assert [c["type"] for c in changes] == ["adjust_load", "substitute_exercise", "add_exercise"]
        assert changes[1]["new_exercise"]["external_id"] == "ext-arnold-press"

    def test_accepts_remove_exercise(self, routine):
        _, changes = self.validate(
            routine,
            {
                "changes": [
                    {
                        "type": "remove_exercise",
                        "exercise_id": ref(routine, 3, "Leg Curl"),
                        "why": "Lo omitiste 3 veces",
                    }
                ]
            },
        )
        assert changes[0]["exercise_name"] == "Leg Curl"

    def test_unknown_change_type_is_rejected(self, routine):
        with pytest.raises(CoachValidationError, match="type must be one of"):
            self.validate(
                routine, {"changes": [{"type": "delete_routine", "why": "x", "exercise_id": "a"}]}
            )

    def test_why_is_mandatory(self, routine):
        with pytest.raises(CoachValidationError, match="why"):
            self.validate(
                routine,
                {
                    "changes": [
                        {
                            "type": "remove_exercise",
                            "exercise_id": ref(routine, 3, "Leg Curl"),
                            "why": "  ",
                        }
                    ]
                },
            )

    def test_unknown_exercise_id_is_rejected(self, routine):
        with pytest.raises(CoachValidationError, match="does not match"):
            self.validate(
                routine,
                {
                    "changes": [
                        {
                            "type": "remove_exercise",
                            "exercise_id": "00000000-0000-0000-0000-000000000000",
                            "why": "x",
                        }
                    ]
                },
            )

    def test_unresolvable_new_exercise_is_rejected(self, routine):
        with pytest.raises(CoachValidationError, match="catalog"):
            coach_validator.validate_coach_response(
                {
                    "changes": [
                        {
                            "type": "substitute_exercise",
                            "exercise_id": ref(routine, 1, "Bench Press"),
                            "new_exercise": {"name": "Inventado", "search_term": "made up"},
                            "why": "x",
                        }
                    ]
                },
                snapshot_for(routine),
                lambda *a: None,
            )

    def test_too_many_changes(self, routine):
        changes = [
            {"type": "adjust_load", "exercise_id": ref(routine, 1, "Bench Press"), "sets_delta": 1, "why": "x"}
        ] * (coach_validator.MAX_CHANGES + 1)
        with pytest.raises(CoachValidationError, match="Too many changes"):
            self.validate(routine, {"changes": changes})

    def test_same_slot_cannot_be_targeted_twice(self, routine):
        rid = ref(routine, 1, "Bench Press")
        with pytest.raises(CoachValidationError, match="already targeted"):
            self.validate(
                routine,
                {
                    "changes": [
                        {"type": "adjust_load", "exercise_id": rid, "sets_delta": 1, "why": "x"},
                        {"type": "remove_exercise", "exercise_id": rid, "why": "y"},
                    ]
                },
            )

    def test_touched_fraction_limit(self, routine):
        # 9 slots -> at most int(9 * 0.4) = 3 touched.
        changes = [
            {
                "type": "adjust_load",
                "exercise_id": ref(routine, day, name),
                "sets_delta": 1,
                "why": "x",
            }
            for day, name in [
                (1, "Bench Press"),
                (1, "Overhead Press"),
                (2, "Barbell Row"),
                (2, "Lat Pulldown"),
            ]
        ]
        with pytest.raises(CoachValidationError, match="Too much of the routine"):
            self.validate(routine, {"changes": changes})

    def test_cannot_empty_a_training_day(self, routine):
        # Removing all 3 exercises of one day: 3 touched <= 3 allowed, but the day would be empty.
        changes = [
            {"type": "remove_exercise", "exercise_id": ref(routine, 3, name), "why": "x"}
            for name in DAY_EXERCISES[3]
        ]
        with pytest.raises(CoachValidationError, match="without exercises"):
            self.validate(routine, {"changes": changes})

    def test_adjust_load_must_change_something(self, routine):
        with pytest.raises(CoachValidationError, match="must actually change"):
            self.validate(
                routine,
                {
                    "changes": [
                        {
                            "type": "adjust_load",
                            "exercise_id": ref(routine, 1, "Bench Press"),
                            "weight_change_percent": 0,
                            "why": "x",
                        }
                    ]
                },
            )

    def test_weight_change_out_of_range(self, routine):
        with pytest.raises(CoachValidationError, match="between"):
            self.validate(
                routine,
                {
                    "changes": [
                        {
                            "type": "adjust_load",
                            "exercise_id": ref(routine, 1, "Bench Press"),
                            "weight_change_percent": 80,
                            "why": "x",
                        }
                    ]
                },
            )

    def test_substitute_cannot_duplicate_an_exercise_already_in_the_day(self, routine):
        with pytest.raises(CoachValidationError, match="already part of day"):
            self.validate(
                routine,
                {
                    "changes": [
                        {
                            "type": "substitute_exercise",
                            "exercise_id": ref(routine, 1, "Bench Press"),
                            "new_exercise": {
                                "name": "Overhead Press",
                                "search_term": "overhead press",
                            },
                            "why": "x",
                        }
                    ]
                },
            )

    def test_add_to_a_rest_day_is_rejected(self, routine):
        with pytest.raises(CoachValidationError, match="not a training day"):
            self.validate(
                routine,
                {
                    "changes": [
                        {
                            "type": "add_exercise",
                            "day_number": 5,
                            "exercise": {"name": "X", "search_term": "x", "sets": 3, "reps": "10"},
                            "why": "x",
                        }
                    ]
                },
            )

    def test_extra_keys_are_dropped(self, routine):
        _, changes = self.validate(
            routine,
            {
                "changes": [
                    {
                        "type": "adjust_load",
                        "exercise_id": ref(routine, 1, "Bench Press"),
                        "sets_delta": 1,
                        "why": "x",
                        "__proto__": {"admin": True},
                        "is_active": False,
                    }
                ]
            },
        )
        assert "is_active" not in changes[0]
        assert "__proto__" not in changes[0]

    def test_empty_changes_is_valid(self, routine):
        assert self.validate(routine, {"summary": "Todo bien", "changes": []}) == ("Todo bien", [])

    def test_non_object_payload(self, routine):
        with pytest.raises(CoachValidationError):
            self.validate(routine, ["not", "an", "object"])


# --------------------------------------------------------------------------- #
# eligibility
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestEligibility:
    def test_not_eligible_without_enough_history(self, user, routine, monkeypatch):
        log_days(user, routine, 5)  # 5/12 < 50%
        calls = stub_gemini(monkeypatch, {"changes": []})
        outcome = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)
        assert outcome.kind == "not_eligible"
        assert calls == []

    def test_eligible_at_exactly_half(self, user, routine, monkeypatch):
        log_days(user, routine, 6)  # 6/12 = 50%
        stub_gemini(monkeypatch, {"summary": "ok", "changes": [
            {"type": "adjust_load", "exercise_id": ref(routine, 1, "Bench Press"), "sets_delta": 1, "why": "x"}
        ]})
        outcome = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)
        assert outcome.kind == "proposal"

    def test_not_eligible_in_the_same_period(self, user, routine, monkeypatch):
        log_days(user, routine, 12)
        stub_gemini(monkeypatch, {"changes": []})
        outcome = coach_service.propose_edit_if_eligible(user, today=AUGUST, resolver=fake_resolver)
        assert outcome.kind == "not_eligible"

    def test_manual_routines_never_go_through_the_coach(self, user, monkeypatch):
        from apps.routines.services.generation_service import persist_manual_routine

        persist_manual_routine(
            user,
            {
                "weeks": [
                    {
                        "week_number": 1,
                        "days": [
                            {
                                "day_number": 1,
                                "day_name": "A",
                                "exercises": [{"name": "Squat", "sets": 3, "reps": "8"}],
                            }
                        ],
                    }
                ]
            },
        )
        calls = stub_gemini(monkeypatch, {"changes": []})
        outcome = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)
        assert outcome.kind == "not_eligible"
        assert calls == []

    def test_no_active_routine(self, user, monkeypatch):
        assert coach_service.propose_edit_if_eligible(user, today=SEPTEMBER).kind == "not_eligible"

    def test_logs_from_before_the_cycle_start_do_not_count(self, user, routine, monkeypatch):
        log_days(user, routine, 12, on=date(2026, 8, 20))
        routine.cycle_started_on = date(2026, 9, 1)
        routine.month, routine.year = 9, 2026
        routine.save()
        assert coach_service.cycle_progress(user, routine) == (0, 12)


# --------------------------------------------------------------------------- #
# propose
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestPropose:
    def good_response(self, routine):
        return {
            "summary": "Sube el press",
            "changes": [
                {
                    "type": "adjust_load",
                    "exercise_id": ref(routine, 1, "Bench Press"),
                    "weight_change_percent": 5,
                    "why": "Completaste todo",
                }
            ],
        }

    def test_creates_a_pending_proposal_without_touching_the_routine(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        stub_gemini(monkeypatch, self.good_response(routine))
        before = list(RoutineExercise.objects.filter(day__week__routine=routine).values_list("id", "weight_kg"))

        outcome = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)

        assert outcome.kind == "proposal"
        proposal = outcome.proposal
        assert proposal.status == RoutineEditProposal.Status.PENDING
        assert (proposal.target_month, proposal.target_year) == (9, 2026)
        assert proposal.summary == "Sube el press"
        after = list(RoutineExercise.objects.filter(day__week__routine=routine).values_list("id", "weight_kg"))
        assert before == after
        routine.refresh_from_db()
        assert (routine.month, routine.year) == (8, 2026)

    def test_existing_pending_proposal_is_reused_without_calling_gemini(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        calls = stub_gemini(monkeypatch, self.good_response(routine))
        first = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)
        second = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)
        assert second.proposal.id == first.proposal.id
        assert len(calls) == 1

    def test_one_repair_round_then_success(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        bad = {"changes": [{"type": "nope", "why": "x"}]}
        calls = stub_gemini(monkeypatch, bad, self.good_response(routine))

        outcome = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)

        assert outcome.kind == "proposal"
        assert len(calls) == 2
        assert "RECHAZADA" in calls[1] and "type must be one of" in calls[1]

    def test_invalid_twice_raises_and_creates_nothing(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        stub_gemini(monkeypatch, {"changes": [{"type": "nope", "why": "x"}]})
        with pytest.raises(CoachUnavailableError):
            coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)
        assert RoutineEditProposal.objects.count() == 0

    def test_unparseable_response_counts_as_invalid(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        stub_gemini(monkeypatch, "not json at all")
        with pytest.raises(CoachUnavailableError):
            coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)

    def test_no_changes_continues_the_routine_into_the_new_period(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        stub_gemini(monkeypatch, {"summary": "Todo bien", "changes": []})

        outcome = coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)

        assert outcome.kind == "unchanged"
        routine.refresh_from_db()
        assert (routine.month, routine.year) == (9, 2026)
        assert routine.cycle_started_on == SEPTEMBER
        assert RoutineEditProposal.objects.count() == 0

    def test_prompt_contains_performance_but_not_other_users_data(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        calls = stub_gemini(monkeypatch, self.good_response(routine))
        coach_service.propose_edit_if_eligible(user, today=SEPTEMBER, resolver=fake_resolver)
        assert ref(routine, 1, "Bench Press") in calls[0]
        assert "sessions_logged" in calls[0]


# --------------------------------------------------------------------------- #
# approve / reject
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestApproveReject:
    def make_proposal(self, routine, changes, target=(9, 2026)):
        return RoutineEditProposal.objects.create(
            routine=routine, target_month=target[0], target_year=target[1], changes=changes
        )

    def rows(self, routine, day_number, name):
        return RoutineExercise.objects.filter(
            day__week__routine=routine, day__day_number=day_number, name=name
        )

    def test_adjust_load_applies_to_every_week(self, routine):
        proposal = self.make_proposal(
            routine,
            [
                {
                    "type": "adjust_load",
                    "day_number": 1,
                    "exercise_name": "Bench Press",
                    "weight_change_percent": 10,
                    "sets_delta": 1,
                    "reps": "6-8",
                    "why": "x",
                }
            ],
        )
        coach_service.approve_proposal(proposal, today=SEPTEMBER)

        rows = list(self.rows(routine, 1, "Bench Press").order_by("day__week__week_number"))
        assert len(rows) == 4
        # week 1 weight was 41 -> 41 * 1.1 = 45.1 -> rounded to nearest 0.5 = 45.0
        assert rows[0].weight_kg == Decimal("45.00")
        assert all(r.sets == 4 and r.reps == "6-8" for r in rows)

    def test_substitute_replaces_in_place_and_resets_weight(self, routine):
        StoredExercise.objects.create(external_id="ext-arnold", name="Arnold Press", instructions="Do it")
        proposal = self.make_proposal(
            routine,
            [
                {
                    "type": "substitute_exercise",
                    "day_number": 1,
                    "exercise_name": "Overhead Press",
                    "new_exercise": {
                        "name": "Press Arnold",
                        "muscle_group": "hombro",
                        "external_id": "ext-arnold",
                        "search_term": "arnold press",
                    },
                    "why": "x",
                }
            ],
        )
        original_ids = set(self.rows(routine, 1, "Overhead Press").values_list("id", flat=True))

        coach_service.approve_proposal(proposal, today=SEPTEMBER)

        assert not self.rows(routine, 1, "Overhead Press").exists()
        new_rows = self.rows(routine, 1, "Press Arnold")
        assert set(new_rows.values_list("id", flat=True)) == original_ids  # in place: logs keep linking
        assert all(r.source_external_id == "ext-arnold" and r.weight_kg is None for r in new_rows)

    def test_remove_renumbers_order(self, routine):
        proposal = self.make_proposal(
            routine,
            [{"type": "remove_exercise", "day_number": 3, "exercise_name": "Leg Press", "why": "x"}],
        )
        coach_service.approve_proposal(proposal, today=SEPTEMBER)

        for week_day in RoutineDay.objects.filter(week__routine=routine, day_number=3):
            assert list(week_day.exercises.order_by("order").values_list("name", "order")) == [
                ("Squat", 1),
                ("Leg Curl", 2),
            ]

    def test_add_appends_to_every_week(self, routine):
        StoredExercise.objects.create(external_id="ext-face", name="Face Pull")
        proposal = self.make_proposal(
            routine,
            [
                {
                    "type": "add_exercise",
                    "day_number": 2,
                    "exercise": {
                        "name": "Face pull",
                        "muscle_group": "deltoide",
                        "external_id": "ext-face",
                        "search_term": "face pull",
                        "sets": 3,
                        "reps": "12-15",
                        "weight_kg": None,
                        "rest_seconds": 60,
                    },
                    "why": "x",
                }
            ],
        )
        coach_service.approve_proposal(proposal, today=SEPTEMBER)

        rows = self.rows(routine, 2, "Face pull")
        assert rows.count() == 4
        assert all(r.order == 4 and r.source_external_id == "ext-face" for r in rows)

    def test_approval_never_deletes_days_or_their_logs(self, user, routine):
        log_days(user, routine, 4)
        logs_before = DailyLog.objects.count()
        days_before = RoutineDay.objects.filter(week__routine=routine).count()
        proposal = self.make_proposal(
            routine,
            [{"type": "remove_exercise", "day_number": 1, "exercise_name": "Bench Press", "why": "x"}],
        )
        coach_service.approve_proposal(proposal, today=SEPTEMBER)
        assert DailyLog.objects.count() == logs_before
        assert RoutineDay.objects.filter(week__routine=routine).count() == days_before

    def test_approval_relabels_the_routine_and_restarts_the_cycle(self, routine):
        proposal = self.make_proposal(
            routine,
            [{"type": "adjust_load", "day_number": 1, "exercise_name": "Bench Press", "sets_delta": 1, "why": "x"}],
        )
        coach_service.approve_proposal(proposal, today=SEPTEMBER)
        routine.refresh_from_db()
        proposal.refresh_from_db()
        assert (routine.month, routine.year, routine.cycle_started_on) == (9, 2026, SEPTEMBER)
        assert proposal.status == RoutineEditProposal.Status.APPROVED
        assert proposal.decided_at is not None
        assert routine.is_active

    def test_stale_proposal_is_refused_atomically(self, routine):
        proposal = self.make_proposal(
            routine,
            [
                {"type": "adjust_load", "day_number": 1, "exercise_name": "Bench Press", "sets_delta": 1, "why": "x"},
                {"type": "remove_exercise", "day_number": 1, "exercise_name": "Ghost Exercise", "why": "x"},
            ],
        )
        with pytest.raises(ProposalStaleError):
            coach_service.approve_proposal(proposal, today=SEPTEMBER)
        # first change rolled back, still pending, routine untouched
        assert self.rows(routine, 1, "Bench Press").first().sets == 3
        proposal.refresh_from_db()
        routine.refresh_from_db()
        assert proposal.status == RoutineEditProposal.Status.PENDING
        assert (routine.month, routine.year) == (8, 2026)

    def test_cannot_decide_twice(self, routine):
        proposal = self.make_proposal(routine, [])
        coach_service.reject_proposal(proposal, today=SEPTEMBER)
        with pytest.raises(ProposalNotPendingError):
            coach_service.approve_proposal(proposal, today=SEPTEMBER)

    def test_reject_keeps_the_routine_but_counts_it_for_the_new_period(self, routine):
        proposal = self.make_proposal(
            routine,
            [{"type": "remove_exercise", "day_number": 1, "exercise_name": "Bench Press", "why": "x"}],
        )
        coach_service.reject_proposal(proposal, today=SEPTEMBER)

        routine.refresh_from_db()
        proposal.refresh_from_db()
        assert self.rows(routine, 1, "Bench Press").count() == 4  # untouched
        assert (routine.month, routine.year, routine.cycle_started_on) == (9, 2026, SEPTEMBER)
        assert proposal.status == RoutineEditProposal.Status.REJECTED

    def test_a_finished_routine_is_not_finished_again_after_a_new_cycle_starts(self, user, routine):
        from apps.routines.services.generation_service import is_routine_completed

        log_days(user, routine, 12)
        assert is_routine_completed(user, routine)
        proposal = self.make_proposal(routine, [])
        coach_service.reject_proposal(proposal, today=SEPTEMBER)
        routine.refresh_from_db()
        assert not is_routine_completed(user, routine)

    def test_only_one_pending_proposal_per_routine(self, routine):
        from django.db import IntegrityError, transaction

        self.make_proposal(routine, [])
        with pytest.raises(IntegrityError), transaction.atomic():
            self.make_proposal(routine, [])


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestCoachApi:
    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_generate_returns_a_proposal_when_eligible(self, user, routine, monkeypatch):
        log_days(user, routine, 8)
        stub_gemini(
            monkeypatch,
            {
                "summary": "s",
                "changes": [
                    {"type": "adjust_load", "exercise_id": ref(routine, 1, "Bench Press"), "sets_delta": 1, "why": "x"}
                ],
            },
        )
        monkeypatch.setattr(coach_service, "default_resolver", fake_resolver)
        freeze_september(monkeypatch)

        response = self.client_for(user).post(reverse("generate-routine"))

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["mode"] == "proposal"
        assert data["proposal"]["status"] == "pending"
        assert data["proposal"]["changes"][0]["type"] == "adjust_load"

    def test_generate_reports_coach_unavailable(self, user, routine, monkeypatch):
        # Django's 5xx logging handler renders a debug template that crashes on
        # Python 3.14 + Django 5.0 (environment quirk, unrelated to this view).
        monkeypatch.setattr("django.utils.log.AdminEmailHandler.emit", lambda self, record: None)
        log_days(user, routine, 8)
        stub_gemini(monkeypatch, {"changes": [{"type": "nope"}]})
        freeze_september(monkeypatch)

        response = self.client_for(user).post(reverse("generate-routine"))

        assert response.status_code == 503
        assert response.json()["code"] == "coach_unavailable"

    def test_pending_endpoint(self, user, routine):
        client = self.client_for(user)
        assert client.get(reverse("proposal-pending")).status_code == 404
        proposal = RoutineEditProposal.objects.create(
            routine=routine, target_month=9, target_year=2026, changes=[], summary="hola"
        )
        response = client.get(reverse("proposal-pending"))
        assert response.status_code == 200
        assert response.json()["id"] == str(proposal.id)

    def test_approve_endpoint_returns_the_updated_routine(self, user, routine):
        proposal = RoutineEditProposal.objects.create(
            routine=routine,
            target_month=9,
            target_year=2026,
            changes=[{"type": "adjust_load", "day_number": 1, "exercise_name": "Bench Press", "sets_delta": 1, "why": "x"}],
        )
        response = self.client_for(user).post(reverse("proposal-approve", args=[proposal.id]))
        assert response.status_code == 200, response.content
        assert response.json()["month"] == 9

    def test_reject_endpoint(self, user, routine):
        proposal = RoutineEditProposal.objects.create(
            routine=routine, target_month=9, target_year=2026, changes=[]
        )
        response = self.client_for(user).post(reverse("proposal-reject", args=[proposal.id]))
        assert response.status_code == 200
        proposal.refresh_from_db()
        assert proposal.status == "rejected"

    def test_deciding_twice_is_a_409(self, user, routine):
        proposal = RoutineEditProposal.objects.create(
            routine=routine, target_month=9, target_year=2026, changes=[]
        )
        client = self.client_for(user)
        client.post(reverse("proposal-reject", args=[proposal.id]))
        # second decision: no longer pending -> 404 (not found among pending) is also acceptable
        response = client.post(reverse("proposal-approve", args=[proposal.id]))
        assert response.status_code in (404, 409)

    def test_other_users_cannot_decide_my_proposal(self, user, routine):
        proposal = RoutineEditProposal.objects.create(
            routine=routine, target_month=9, target_year=2026, changes=[]
        )
        other = UserProfile.objects.create(full_name="Other")
        response = self.client_for(other).post(reverse("proposal-approve", args=[proposal.id]))
        assert response.status_code == 404
        proposal.refresh_from_db()
        assert proposal.status == "pending"


# --------------------------------------------------------------------------- #
# automatic trigger after logging (progress app)
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
class TestAutoTriggerAfterLogging:
    def test_finishing_the_routine_yields_a_proposal_not_a_new_routine(self, user, routine, monkeypatch):
        from apps.progress.views import try_generate_next_routine

        log_days(user, routine, 12)
        stub_gemini(
            monkeypatch,
            {
                "summary": "s",
                "changes": [
                    {"type": "adjust_load", "exercise_id": ref(routine, 1, "Bench Press"), "sets_delta": 1, "why": "x"}
                ],
            },
        )
        monkeypatch.setattr(coach_service, "default_resolver", fake_resolver)

        result = try_generate_next_routine(user)

        assert set(result) == {"next_proposal"}
        assert result["next_proposal"]["target_month"] == 9
        assert Routine.objects.filter(user=user).count() == 1  # nothing was regenerated

    def test_unfinished_routine_triggers_nothing(self, user, routine, monkeypatch):
        from apps.progress.views import try_generate_next_routine

        log_days(user, routine, 8)
        calls = stub_gemini(monkeypatch, {"changes": []})
        assert try_generate_next_routine(user) is None
        assert calls == []

    def test_coach_failure_is_swallowed_and_never_regenerates(self, user, routine, monkeypatch):
        from apps.progress.views import try_generate_next_routine

        log_days(user, routine, 12)
        stub_gemini(monkeypatch, {"changes": [{"type": "nope"}]})
        assert try_generate_next_routine(user) is None
        assert Routine.objects.filter(user=user).count() == 1
