import uuid

from django.db import models

from apps.users.models import UserProfile


class Routine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="routines",
    )
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    is_active = models.BooleanField(default=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    gemini_prompt_hash = models.CharField(max_length=128, blank=True)
    raw_gemini_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-year", "-month", "-created_at")
        constraints = (
            models.UniqueConstraint(
                fields=("user", "month", "year"),
                name="unique_routine_per_user_month_year",
            ),
            models.UniqueConstraint(
                fields=("user",),
                condition=models.Q(is_active=True),
                name="unique_active_routine_per_user",
            ),
            models.CheckConstraint(
                check=models.Q(month__gte=1, month__lte=12),
                name="routine_month_between_1_and_12",
            ),
        )

    def __str__(self):
        return f"{self.user} - {self.month:02d}/{self.year}"


class RoutineWeek(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    routine = models.ForeignKey(
        Routine,
        on_delete=models.CASCADE,
        related_name="weeks",
    )
    week_number = models.PositiveSmallIntegerField()
    focus = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("week_number",)
        constraints = (
            models.UniqueConstraint(
                fields=("routine", "week_number"),
                name="unique_week_per_routine",
            ),
            models.CheckConstraint(
                check=models.Q(week_number__gte=1, week_number__lte=4),
                name="routine_week_between_1_and_4",
            ),
        )

    def __str__(self):
        return f"Week {self.week_number} - {self.routine}"


class RoutineDay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    week = models.ForeignKey(
        RoutineWeek,
        on_delete=models.CASCADE,
        related_name="days",
    )
    day_number = models.PositiveSmallIntegerField()
    day_name = models.CharField(max_length=40)
    is_rest_day = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("day_number",)
        constraints = (
            models.UniqueConstraint(
                fields=("week", "day_number"),
                name="unique_day_per_week",
            ),
            models.CheckConstraint(
                check=models.Q(day_number__gte=1, day_number__lte=7),
                name="routine_day_between_1_and_7",
            ),
        )

    def __str__(self):
        return f"Day {self.day_number} - {self.week}"


class RoutineExercise(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    day = models.ForeignKey(
        RoutineDay,
        on_delete=models.CASCADE,
        related_name="exercises",
    )
    name = models.CharField(max_length=120)
    muscle_group = models.CharField(max_length=80, blank=True)
    sets = models.PositiveSmallIntegerField(null=True, blank=True)
    reps = models.CharField(max_length=40, blank=True)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    rest_seconds = models.PositiveSmallIntegerField(null=True, blank=True)
    image_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    variants = models.JSONField(default=list, blank=True)
    instructions = models.TextField(blank=True)
    search_term = models.CharField(max_length=120, blank=True)
    order = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "created_at")
        constraints = (
            models.UniqueConstraint(
                fields=("day", "order"),
                name="unique_exercise_order_per_day",
            ),
        )

    def __str__(self):
        return self.name
