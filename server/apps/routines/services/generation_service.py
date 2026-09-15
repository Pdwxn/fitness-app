import hashlib
import logging
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.profiles.views import is_onboarding_complete
from apps.routines.models import Routine, RoutineDay, RoutineExercise, RoutineWeek
from .exercisedb_service import enrich_routine
from .gemini_service import build_routine_prompt, generate_routine_with_gemini, parse_gemini_routine_response

logger = logging.getLogger(__name__)


class OnboardingIncompleteError(APIException):
    status_code = 400
    default_detail = "Complete onboarding before generating a routine."
    default_code = "onboarding_incomplete"


class MonthlyRoutineExistsError(APIException):
    status_code = 409
    default_detail = "You already have a routine for this month."
    default_code = "monthly_routine_exists"


class ActiveManualRoutineError(APIException):
    status_code = 409
    default_detail = "Deactivate your manual routine before generating one with AI."
    default_code = "active_manual_routine"


def _ensure_no_active_manual_routine(user):
    active = Routine.objects.filter(user=user, is_active=True).first()
    if active is not None and active.source == Routine.Source.MANUAL:
        raise ActiveManualRoutineError()


def ensure_user_can_generate_routine(user, today=None):
    today = today or timezone.now().date()
    if not is_onboarding_complete(user):
        raise OnboardingIncompleteError()

    _ensure_no_active_manual_routine(user)

    if get_current_month_routine(user, today=today) is not None:
        raise MonthlyRoutineExistsError()


def generate_and_persist_routine(user, previous_month_notes=None, today=None):
    routine, _ = generate_monthly_routine_if_needed(
        user,
        today=today,
        previous_month_notes=previous_month_notes,
        return_existing=False,
    )
    return routine


def get_current_month_routine(user, today=None):
    today = today or timezone.now().date()
    return Routine.objects.filter(
        user=user,
        month=today.month,
        year=today.year,
    ).prefetch_related("weeks__days__exercises").first()


def can_generate_monthly_routine(user, today=None):
    return is_onboarding_complete(user) and get_current_month_routine(user, today=today) is None


def generate_monthly_routine_if_needed(
    user,
    today=None,
    previous_month_notes=None,
    return_existing=True,
):
    today = today or timezone.now().date()
    if not is_onboarding_complete(user):
        raise OnboardingIncompleteError()

    _ensure_no_active_manual_routine(user)

    existing_routine = get_current_month_routine(user, today=today)
    if existing_routine is not None:
        if return_existing:
            return existing_routine, False
        raise MonthlyRoutineExistsError()

    if previous_month_notes is None:
        previous_month_notes = get_previous_month_notes(user, today=today)

    prompt = build_routine_prompt(user, previous_month_notes=previous_month_notes)
    raw_response = generate_routine_with_gemini(user, previous_month_notes=previous_month_notes)
    routine_data = parse_gemini_routine_response(raw_response)
    routine = persist_generated_routine(
        user=user,
        routine_data=routine_data,
        raw_response=raw_response,
        prompt=prompt,
        today=today,
    )
    return routine, True


def is_routine_completed(user, routine):
    from apps.progress.models import DailyLog

    total_training_days = RoutineDay.objects.filter(
        week__routine=routine, is_rest_day=False
    ).count()

    completed_day_ids = DailyLog.objects.filter(
        user=user, routine_day__week__routine=routine, completed=True
    ).values_list("routine_day_id", flat=True).distinct()

    return total_training_days > 0 and completed_day_ids.count() >= total_training_days


def get_routine_daily_notes(user, routine):
    from apps.progress.models import DailyLog

    logs = DailyLog.objects.filter(
        user=user, routine_day__week__routine=routine
    ).select_related("routine_day").order_by("routine_day__day_number")

    notes = []
    for log in logs:
        exercise_notes = [
            {
                "exercise_name": exercise.get("exercise_name", ""),
                "completed": exercise.get("completed", False),
                "note": exercise.get("note", ""),
            }
            for exercise in log.exercises_done
            if exercise.get("note") or not exercise.get("completed", False)
        ]
        if log.day_note or exercise_notes:
            notes.append(
                {
                    "date": log.date.isoformat(),
                    "day_name": log.routine_day.day_name,
                    "completed": log.completed,
                    "day_note": log.day_note,
                    "exercise_notes": exercise_notes,
                }
            )

    return notes


def get_previous_month_notes(user, today=None):
    from apps.progress.models import DailyLog

    today = today or timezone.now().date()
    start_of_current_month = today.replace(day=1)
    last_day_previous_month = start_of_current_month - timedelta(days=1)
    start_of_previous_month = last_day_previous_month.replace(day=1)

    logs = DailyLog.objects.filter(
        user=user,
        date__gte=start_of_previous_month,
        date__lt=start_of_current_month,
    ).select_related("routine_day")

    notes = []
    for log in logs:
        exercise_notes = [
            {
                "exercise_name": exercise.get("exercise_name", ""),
                "completed": exercise.get("completed", False),
                "note": exercise.get("note", ""),
            }
            for exercise in log.exercises_done
            if exercise.get("note") or not exercise.get("completed", False)
        ]
        if log.day_note or exercise_notes:
            notes.append(
                {
                    "date": log.date.isoformat(),
                    "day_name": log.routine_day.day_name,
                    "completed": log.completed,
                    "day_note": log.day_note,
                    "exercise_notes": exercise_notes,
                }
            )

    return notes


def _build_routine_tree(routine, routine_data):
    for week_data in routine_data["weeks"]:
        week = RoutineWeek.objects.create(
            routine=routine,
            week_number=week_data["week_number"],
            focus=week_data.get("focus", ""),
            notes=week_data.get("notes", ""),
        )
        for day_data in week_data["days"]:
            day = RoutineDay.objects.create(
                week=week,
                day_number=day_data["day_number"],
                day_name=day_data["day_name"],
                is_rest_day=day_data.get("is_rest_day", False),
            )
            for fallback_order, exercise_data in enumerate(
                day_data.get("exercises", []), start=1
            ):
                RoutineExercise.objects.create(
                    day=day,
                    name=exercise_data["name"],
                    muscle_group=exercise_data.get("muscle_group", ""),
                    source_external_id=exercise_data.get("external_id", ""),
                    sets=exercise_data.get("sets"),
                    reps=exercise_data.get("reps", ""),
                    weight_kg=exercise_data.get("weight_kg"),
                    rest_seconds=exercise_data.get("rest_seconds"),
                    variants=exercise_data.get("variants", []),
                    instructions=exercise_data.get("instructions", ""),
                    search_term=exercise_data.get("search_term", ""),
                    order=exercise_data.get("order") or fallback_order,
                )


def persist_routine(user, routine_data, *, source, raw_response=None, prompt=None, today=None):
    """Persist a full routine tree and make it the user's single active routine.

    - ``source == AI_GENERATED``: requires month/year (from ``today``), stores the
      Gemini prompt hash and raw response, and treats a uniqueness collision as
      :class:`MonthlyRoutineExistsError`.
    - ``source == MANUAL``: month/year stay NULL, no Gemini fields.

    Runs ``enrich_routine`` at the end in both cases (best-effort).
    """
    if not isinstance(routine_data, dict) or not routine_data.get("weeks"):
        raise ValidationError({"routine_data": "Routine data must include weeks."})

    is_ai = source == Routine.Source.AI_GENERATED
    month = year = None
    generated_at = None
    gemini_prompt_hash = ""
    raw_gemini_response = None

    if is_ai:
        today = today or timezone.now().date()
        month, year = today.month, today.year
        generated_at = timezone.now()
        gemini_prompt_hash = (
            hashlib.sha256(prompt.encode("utf-8")).hexdigest() if prompt else ""
        )
        raw_gemini_response = {"raw": raw_response, "parsed": routine_data}
        if Routine.objects.filter(
            user=user, month=month, year=year, source=Routine.Source.AI_GENERATED
        ).exists():
            raise MonthlyRoutineExistsError()

    try:
        with transaction.atomic():
            Routine.objects.filter(user=user, is_active=True).update(is_active=False)
            routine = Routine.objects.create(
                user=user,
                source=source,
                month=month,
                year=year,
                is_active=True,
                generated_at=generated_at,
                gemini_prompt_hash=gemini_prompt_hash,
                raw_gemini_response=raw_gemini_response,
            )
            _build_routine_tree(routine, routine_data)
    except IntegrityError as exc:
        if is_ai:
            raise MonthlyRoutineExistsError() from exc
        raise APIException("Could not save the routine, please try again.") from exc

    try:
        enrich_routine(routine)
    except Exception as exc:
        logger.exception("ExerciseDB enrichment failed for routine %s: %s", routine.id, exc)

    if is_ai:
        try:
            from apps.notifications.services.push_service import notify_routine_ready

            notify_routine_ready(user, routine)
        except Exception:
            logger.exception("Failed to send 'routine ready' push for routine %s", routine.id)

    return Routine.objects.prefetch_related("weeks__days__exercises").get(id=routine.id)


def persist_generated_routine(user, routine_data, raw_response, prompt, today=None):
    return persist_routine(
        user,
        routine_data,
        source=Routine.Source.AI_GENERATED,
        raw_response=raw_response,
        prompt=prompt,
        today=today,
    )


def persist_manual_routine(user, routine_data):
    """Safe entry point for a user-built routine: normalizes then persists."""
    from .routine_validation import validate_manual_routine_payload

    normalized = validate_manual_routine_payload(routine_data)
    return persist_routine(user, normalized, source=Routine.Source.MANUAL)
