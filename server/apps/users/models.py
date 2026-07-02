import uuid

from django.db import models

from apps.shared.managers import ActiveManager


class UserProfile(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"

    class Language(models.TextChoices):
        SPANISH = "es", "Spanish"
        ENGLISH = "en", "English"

    class Units(models.TextChoices):
        METRIC = "metric", "Metric"
        IMPERIAL = "imperial", "Imperial"

    class ExperienceLevel(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    class TrainingStyle(models.TextChoices):
        STRENGTH = "strength", "Strength"
        HYPERTROPHY = "hypertrophy", "Hypertrophy"
        ENDURANCE = "endurance", "Endurance"
        POWER = "power", "Power"
        GENERAL = "general", "General"

    class IntensityPreference(models.TextChoices):
        ALWAYS_FAILURE = "always_failure", "Always to failure"
        NEAR_FAILURE = "near_failure", "Near failure"
        COMFORTABLE = "comfortable", "Comfortable"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=100, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        blank=True,
    )
    age = models.PositiveIntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    preferred_language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.SPANISH,
    )
    preferred_units = models.CharField(
        max_length=10,
        choices=Units.choices,
        default=Units.METRIC,
    )

    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevel.choices,
        blank=True,
    )
    training_style = models.CharField(
        max_length=20,
        choices=TrainingStyle.choices,
        blank=True,
    )
    priority_muscles = models.JSONField(default=list, blank=True)
    intensity_preference = models.CharField(
        max_length=20,
        choices=IntensityPreference.choices,
        blank=True,
    )
    medical_conditions = models.JSONField(default=list, blank=True)
    days_per_week = models.PositiveSmallIntegerField(null=True, blank=True)
    session_duration_minutes = models.PositiveSmallIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.full_name or str(self.id)
