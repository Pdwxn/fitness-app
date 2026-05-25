import hashlib

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from apps.profiles.views import is_onboarding_complete
from apps.routines.models import Routine, RoutineDay, RoutineExercise, RoutineWeek

from .gemini_service import build_routine_prompt, generate_routine_with_gemini, parse_gemini_routine_response


class OnboardingIncompleteError(APIException):
    status_code = 400
    default_detail = "Complete onboarding before generating a routine."
    default_code = "onboarding_incomplete"


class MonthlyRoutineExistsError(APIException):
    status_code = 409
    default_detail = "You already have a routine for this month."
    default_code = "monthly_routine_exists"


def ensure_user_can_generate_routine(user, today=None):
    today = today or timezone.now().date()
    if not is_onboarding_complete(user):
        raise OnboardingIncompleteError()

    if Routine.objects.filter(user=user, month=today.month, year=today.year).exists():
        raise MonthlyRoutineExistsError()


def generate_and_persist_routine(user, previous_month_notes=None, today=None):
    today = today or timezone.now().date()
    ensure_user_can_generate_routine(user, today=today)

    prompt = build_routine_prompt(user, previous_month_notes=previous_month_notes)
    raw_response = generate_routine_with_gemini(user, previous_month_notes=previous_month_notes)
    routine_data = parse_gemini_routine_response(raw_response)
    return persist_generated_routine(
        user=user,
        routine_data=routine_data,
        raw_response=raw_response,
        prompt=prompt,
        today=today,
    )


def persist_generated_routine(user, routine_data, raw_response, prompt, today=None):
    today = today or timezone.now().date()
    if Routine.objects.filter(user=user, month=today.month, year=today.year).exists():
        raise MonthlyRoutineExistsError()

    if not isinstance(routine_data, dict) or not routine_data.get("weeks"):
        raise ValidationError({"routine_data": "Routine data must include weeks."})

    with transaction.atomic():
        Routine.objects.filter(user=user, is_active=True).update(is_active=False)
        routine = Routine.objects.create(
            user=user,
            month=today.month,
            year=today.year,
            is_active=True,
            generated_at=timezone.now(),
            gemini_prompt_hash=hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
            raw_gemini_response={"raw": raw_response, "parsed": routine_data},
        )

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
                for exercise_data in day_data.get("exercises", []):
                    RoutineExercise.objects.create(
                        day=day,
                        name=exercise_data["name"],
                        muscle_group=exercise_data.get("muscle_group", ""),
                        sets=exercise_data.get("sets"),
                        reps=exercise_data.get("reps", ""),
                        weight_kg=exercise_data.get("weight_kg"),
                        rest_seconds=exercise_data.get("rest_seconds"),
                        variants=exercise_data.get("variants", []),
                        instructions=exercise_data.get("instructions", ""),
                        search_term=exercise_data.get("search_term", ""),
                        order=exercise_data["order"],
                    )

    return Routine.objects.prefetch_related("weeks__days__exercises").get(id=routine.id)
