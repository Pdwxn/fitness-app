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


class RoutineNotEditableError(APIException):
    status_code = 403
    default_detail = "AI-generated routines cannot be edited; regenerate instead."
    default_code = "ai_routine_not_editable"


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
    from .coach_service import cycle_progress

    completed, total = cycle_progress(user, routine)
    return total > 0 and completed >= total


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


def delete_manual_routine(routine):
    """Soft-deletes a manual routine (whether active or not).

    AI-generated routines aren't deletable this way -- they archive themselves
    (``is_active=False``) when the next monthly one is generated.
    """
    if routine.source != Routine.Source.MANUAL:
        raise RoutineNotEditableError()

    routine.deleted_at = timezone.now()
    routine.save(update_fields=["deleted_at", "updated_at"])


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


def _norm_name(name):
    return " ".join(str(name).strip().lower().split())


def _sync_exercises(day, exercises_data):
    """Make ``day``'s exercises match ``exercises_data``, keeping matched rows.

    A row is matched by catalog id (``source_external_id``) when the payload
    has one, otherwise by name -- so the exercise ids that logged entries
    point at survive edits, reorders and tweaks. Unmatched rows are deleted
    (safe: logs reference exercises by id inside JSON, not by foreign key).
    """
    existing = list(RoutineExercise.objects.filter(day=day).order_by("order"))
    available = list(existing)
    pairs = []  # (payload item, matched row or None)
    for item in exercises_data:
        external_id = item.get("external_id", "")
        match = None
        if external_id:
            match = next((r for r in available if r.source_external_id == external_id), None)
        if match is None:
            match = next((r for r in available if _norm_name(r.name) == _norm_name(item["name"])), None)
        if match is not None:
            available.remove(match)
        pairs.append((item, match))

    RoutineExercise.objects.filter(id__in=[r.id for r in available]).delete()
    # unique (day, order): park kept rows out of the way before renumbering.
    for offset, (_, row) in enumerate(pairs):
        if row is not None:
            RoutineExercise.objects.filter(id=row.id).update(order=10000 + offset)

    for position, (item, row) in enumerate(pairs, start=1):
        fields = {
            "name": item["name"],
            "muscle_group": item.get("muscle_group", ""),
            "sets": item.get("sets"),
            "reps": item.get("reps", ""),
            "weight_kg": item.get("weight_kg"),
            "rest_seconds": item.get("rest_seconds"),
            "order": position,
        }
        if row is None:
            RoutineExercise.objects.create(
                day=day,
                source_external_id=item.get("external_id", ""),
                variants=item.get("variants", []),
                instructions=item.get("instructions", ""),
                search_term=item.get("search_term", ""),
                **fields,
            )
            continue
        for name, value in fields.items():
            setattr(row, name, value)
        if item.get("external_id"):
            row.source_external_id = item["external_id"]
        # The builder doesn't send these; don't wipe what enrichment filled in.
        if item.get("instructions"):
            row.instructions = item["instructions"]
        if item.get("variants"):
            row.variants = item["variants"]
        row.save()


def _sync_routine_tree(routine, routine_data):
    """Update ``routine``'s weeks/days/exercises in place to match ``routine_data``.

    ``DailyLog.routine_day`` is ON DELETE CASCADE, so deleting and rebuilding
    days destroys the user's logged history. Weeks and days are therefore
    matched by number and updated; ones missing from the payload are
    soft-deleted (their logs stay in the database) and revived if a later
    edit brings them back.
    """
    now = timezone.now()
    week_numbers = {w["week_number"] for w in routine_data["weeks"]}

    for week in RoutineWeek.all_objects.filter(routine=routine):
        if week.week_number not in week_numbers and week.deleted_at is None:
            week.deleted_at = now
            week.save(update_fields=["deleted_at", "updated_at"])

    for week_data in routine_data["weeks"]:
        week = RoutineWeek.all_objects.filter(
            routine=routine, week_number=week_data["week_number"]
        ).first()
        if week is None:
            week = RoutineWeek(routine=routine, week_number=week_data["week_number"])
        week.focus = week_data.get("focus", "")
        week.notes = week_data.get("notes", "")
        week.deleted_at = None
        week.save()

        day_numbers = {d["day_number"] for d in week_data["days"]}
        for day in RoutineDay.all_objects.filter(week=week):
            if day.day_number not in day_numbers and day.deleted_at is None:
                day.deleted_at = now
                day.save(update_fields=["deleted_at", "updated_at"])

        for day_data in week_data["days"]:
            day = RoutineDay.all_objects.filter(week=week, day_number=day_data["day_number"]).first()
            if day is None:
                day = RoutineDay(week=week, day_number=day_data["day_number"])
            day.day_name = day_data["day_name"]
            day.is_rest_day = day_data.get("is_rest_day", False)
            day.deleted_at = None
            day.save()
            _sync_exercises(day, day_data.get("exercises", []))


def update_manual_routine(routine, routine_data):
    """Update a manual routine's weeks/days/exercises to match ``routine_data``.

    Keeps ``id`` / ``is_active`` / ``created_at`` -- and, crucially, the
    user's logged history: the tree is synced in place (see
    :func:`_sync_routine_tree`) instead of being deleted and rebuilt.
    Only `source=manual` routines are editable -- AI-generated ones are
    regenerated, not edited. Re-runs `enrich_routine` (best-effort).
    """
    from .routine_validation import validate_manual_routine_payload

    if routine.source != Routine.Source.MANUAL:
        raise RoutineNotEditableError()

    normalized = validate_manual_routine_payload(routine_data)

    with transaction.atomic():
        _sync_routine_tree(routine, normalized)
        routine.save(update_fields=["updated_at"])

    try:
        enrich_routine(routine)
    except Exception as exc:
        logger.exception("ExerciseDB enrichment failed for routine %s: %s", routine.id, exc)

    return Routine.objects.prefetch_related("weeks__days__exercises").get(id=routine.id)
