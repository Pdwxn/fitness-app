from django.db import transaction
from django.utils import timezone

from apps.routines.models import Routine, RoutineDay, RoutineExercise, RoutineWeek


DAY_NAMES = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)

WORKOUT_TEMPLATES = (
    {
        "focus": "Push strength",
        "exercises": (
            ("Bench Press", "chest", 4, "6-8", 120),
            ("Incline Dumbbell Press", "chest", 3, "8-10", 90),
            ("Shoulder Press", "shoulders", 3, "8-10", 90),
            ("Triceps Rope Pushdown", "triceps", 3, "10-12", 60),
        ),
    },
    {
        "focus": "Pull volume",
        "exercises": (
            ("Pull Up", "back", 4, "6-10", 120),
            ("Seated Cable Row", "back", 3, "8-10", 90),
            ("Face Pull", "rear delts", 3, "12-15", 60),
            ("Dumbbell Curl", "biceps", 3, "10-12", 60),
        ),
    },
    {
        "focus": "Leg power",
        "exercises": (
            ("Back Squat", "legs", 4, "6-8", 150),
            ("Romanian Deadlift", "hamstrings", 3, "8-10", 120),
            ("Walking Lunge", "legs", 3, "10 each leg", 90),
            ("Standing Calf Raise", "calves", 4, "12-15", 60),
        ),
    },
    {
        "focus": "Full body conditioning",
        "exercises": (
            ("Goblet Squat", "legs", 3, "10-12", 75),
            ("Push Up", "chest", 3, "AMRAP", 75),
            ("Kettlebell Swing", "posterior chain", 3, "15", 60),
            ("Plank", "core", 3, "45 seconds", 45),
        ),
    },
)


def seed_dev_routine(user):
    now = timezone.now()
    existing_routine = Routine.objects.filter(
        user=user,
        month=now.month,
        year=now.year,
    ).first()
    if existing_routine is not None:
        return existing_routine, False

    with transaction.atomic():
        Routine.objects.filter(user=user, is_active=True).update(is_active=False)
        routine = Routine.objects.create(
            user=user,
            month=now.month,
            year=now.year,
            is_active=True,
            generated_at=now,
            gemini_prompt_hash="dev-seed",
            raw_gemini_response={"source": "dev_seed"},
        )

        for week_number in range(1, 5):
            week = RoutineWeek.objects.create(
                routine=routine,
                week_number=week_number,
                focus=f"Foundation week {week_number}",
                notes="Development seed routine for UI and API testing.",
            )

            for day_number, day_name in enumerate(DAY_NAMES, start=1):
                is_rest_day = day_number in (4, 7)
                day = RoutineDay.objects.create(
                    week=week,
                    day_number=day_number,
                    day_name=day_name,
                    is_rest_day=is_rest_day,
                )

                if is_rest_day:
                    continue

                template = WORKOUT_TEMPLATES[(day_number + week_number - 2) % len(WORKOUT_TEMPLATES)]
                for order, (name, muscle_group, sets, reps, rest_seconds) in enumerate(
                    template["exercises"],
                    start=1,
                ):
                    RoutineExercise.objects.create(
                        day=day,
                        name=name,
                        muscle_group=muscle_group,
                        sets=sets,
                        reps=reps,
                        rest_seconds=rest_seconds,
                        instructions=f"Perform {name.lower()} with controlled tempo and clean form.",
                        search_term=name,
                        order=order,
                    )

        return routine, True
