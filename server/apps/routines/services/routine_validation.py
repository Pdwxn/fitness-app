"""Shared validation / normalization for routine payloads (weeks -> days -> exercises).

Two callers, two modes:

- ``gemini_service`` parses AI responses in **strict** mode: exactly 4 weeks
  numbered 1-4, exactly 7 days per week numbered 1-7.
- ``ManualRoutineInputSerializer`` uses **relaxed** mode: 1-4 weeks and 1-7 days
  per week, numbered contiguously from 1, plus the business minimums enforced by
  :func:`validate_manual_routine_payload`.

The normalized output shape is identical in both modes, so
``persist_routine`` does not care which flow produced it.
"""
from rest_framework.exceptions import ValidationError


def clean_text(value, max_length=None):
    if value is None:
        return ""
    cleaned = str(value).strip()
    if max_length is not None:
        return cleaned[:max_length]
    return cleaned


def clean_required_text(value, field_name, max_length=None):
    cleaned = clean_text(value, max_length)
    if not cleaned:
        raise ValidationError({field_name: "This field is required."})
    return cleaned


def coerce_int(value, field_name):
    try:
        result = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: "Must be an integer."}) from exc
    if result < 0:
        raise ValidationError({field_name: "Must be zero or greater."})
    return result


def coerce_decimal_string(value, field_name):
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: "Must be a number."}) from exc
    if result < 0:
        raise ValidationError({field_name: "Must be zero or greater."})
    return f"{result:.2f}"


def validate_exercise_payload(exercise, fallback_order):
    if not isinstance(exercise, dict):
        raise ValidationError("Each exercise must be an object.")

    sets = exercise.get("sets")
    rest_seconds = exercise.get("rest_seconds")
    weight_kg = exercise.get("weight_kg")
    variants = exercise.get("variants", [])

    return {
        "name": clean_required_text(exercise.get("name"), "name", 120),
        "muscle_group": clean_text(exercise.get("muscle_group", ""), 80),
        "external_id": clean_text(exercise.get("external_id", ""), 100),
        "sets": coerce_int(sets, "sets") if sets not in (None, "") else None,
        "reps": clean_text(exercise.get("reps", ""), 40),
        "weight_kg": coerce_decimal_string(weight_kg, "weight_kg") if weight_kg not in (None, "") else None,
        "rest_seconds": coerce_int(rest_seconds, "rest_seconds") if rest_seconds not in (None, "") else None,
        "instructions": clean_text(exercise.get("instructions", "")),
        "search_term": clean_text(exercise.get("search_term", ""), 120),
        "variants": variants if isinstance(variants, list) else [],
        "order": coerce_int(exercise.get("order", fallback_order), "order"),
    }


def validate_day_payload(day):
    if not isinstance(day, dict):
        raise ValidationError("Each day must be an object.")

    day_number = coerce_int(day.get("day_number"), "day_number")
    if day_number < 1 or day_number > 7:
        raise ValidationError({"day_number": "Day number must be between 1 and 7."})

    is_rest_day = bool(day.get("is_rest_day", False))
    exercises = day.get("exercises", [])
    if not isinstance(exercises, list):
        raise ValidationError({"exercises": "Exercises must be a list."})

    normalized_exercises = [
        validate_exercise_payload(exercise, order)
        for order, exercise in enumerate(exercises, start=1)
    ]

    return {
        "day_number": day_number,
        "day_name": clean_required_text(day.get("day_name"), "day_name", 40),
        "is_rest_day": is_rest_day,
        "exercises": normalized_exercises,
    }


def validate_week_payload(week, *, strict=True):
    if not isinstance(week, dict):
        raise ValidationError("Each week must be an object.")

    week_number = coerce_int(week.get("week_number"), "week_number")
    if week_number < 1 or week_number > 4:
        raise ValidationError({"week_number": "Week number must be between 1 and 4."})

    days = week.get("days")
    if not isinstance(days, list) or not days:
        raise ValidationError({"days": f"Week {week_number} must include at least one day."})
    if strict and len(days) != 7:
        raise ValidationError({"days": f"Week {week_number} must include exactly 7 days."})
    if len(days) > 7:
        raise ValidationError({"days": f"Week {week_number} cannot include more than 7 days."})

    normalized_days = []
    seen_days = set()
    for day in days:
        normalized_day = validate_day_payload(day)
        day_number = normalized_day["day_number"]
        if day_number in seen_days:
            raise ValidationError({"days": f"Day {day_number} is duplicated in week {week_number}."})
        seen_days.add(day_number)
        normalized_days.append(normalized_day)

    if strict and seen_days != {1, 2, 3, 4, 5, 6, 7}:
        raise ValidationError({"days": f"Week {week_number} days must be numbered 1 through 7."})
    # relaxed mode: any unique subset of 1..7 is fine (a 3-day split can use days
    # 1/3/5 for Mon/Wed/Fri, or 1/2/3 -- the builder decides).

    normalized_days.sort(key=lambda day: day["day_number"])
    return {
        "week_number": week_number,
        "focus": clean_text(week.get("focus", ""), 120),
        "notes": clean_text(week.get("notes", "")),
        "days": normalized_days,
    }


def validate_routine_payload(payload, *, strict=True):
    if not isinstance(payload, dict):
        raise ValidationError("Routine payload must be a JSON object.")

    weeks = payload.get("weeks")
    if not isinstance(weeks, list) or not weeks:
        raise ValidationError({"weeks": "Routine must include at least one week."})
    if strict and len(weeks) != 4:
        raise ValidationError({"weeks": "Routine must include exactly 4 weeks."})
    if len(weeks) > 4:
        raise ValidationError({"weeks": "Routine cannot include more than 4 weeks."})

    normalized_weeks = []
    seen_weeks = set()
    for week in weeks:
        normalized_week = validate_week_payload(week, strict=strict)
        week_number = normalized_week["week_number"]
        if week_number in seen_weeks:
            raise ValidationError({"weeks": f"Week {week_number} is duplicated."})
        seen_weeks.add(week_number)
        normalized_weeks.append(normalized_week)

    if strict:
        expected_weeks = {1, 2, 3, 4}
    else:
        expected_weeks = set(range(1, len(normalized_weeks) + 1))
    if seen_weeks != expected_weeks:
        raise ValidationError(
            {"weeks": f"Routine weeks must be numbered 1 through {len(normalized_weeks)}."}
        )

    normalized_weeks.sort(key=lambda week: week["week_number"])
    return {"weeks": normalized_weeks}


def validate_manual_routine_payload(payload):
    """Relaxed validation + business minimums for a user-built routine."""
    data = validate_routine_payload(payload, strict=False)

    for week in data["weeks"]:
        training_days = [day for day in week["days"] if not day["is_rest_day"]]
        if not training_days:
            raise ValidationError(
                {"weeks": f"Week {week['week_number']} needs at least one training day."}
            )
        for day in training_days:
            if not day["exercises"]:
                raise ValidationError(
                    {
                        "days": (
                            f"Day {day['day_number']} in week {week['week_number']} "
                            "needs at least one exercise."
                        )
                    }
                )

    return data
